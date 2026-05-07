import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { TurnService } from './turn.service';
import { DmService } from '../dm/dm.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CharactersService } from '../characters/characters.service';
import { JoinCampaignDto, SubmitActionDto } from './dto/game-events.dto';
import { WsJwtGuard } from './ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private gameService: GameService,
    private turnService: TurnService,
    private dmService: DmService,
    private campaignsService: CampaignsService,
    private charactersService: CharactersService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Remove from all campaigns
    const rooms = Array.from(client.rooms);
    for (const room of rooms) {
      if (room.startsWith('campaign:')) {
        const campaignId = room.replace('campaign:', '');
        await this.gameService.removeActivePlayer(campaignId, client.id);
        
        const activePlayers = await this.gameService.getActivePlayers(campaignId);
        this.server.to(room).emit('player:left', {
          socketId: client.id,
          activePlayers: activePlayers.length,
        });
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('campaign:join')
  async handleJoinCampaign(
    @MessageBody() data: JoinCampaignDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { campaignId } = data;
    const userId = (client as any).user?.userId;
    const username = (client as any).user?.username;

    if (!userId) {
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Not authenticated' });
      return;
    }

    try {
      const roomName = `campaign:${campaignId}`;
      client.join(roomName);

      await this.gameService.addActivePlayer(campaignId, client.id, userId);

      const { campaign, players, characters } = await this.gameService.getCampaignWithPlayers(campaignId);
      
      // Initialize or get turn queue
      const turnQueue = await this.turnService.getTurnQueue(campaignId);
      if (turnQueue.length === 0 && players.length > 0) {
        await this.turnService.initializeTurnQueue(
          campaignId,
          players.map((p) => p.userId),
        );
      } else {
        await this.turnService.addPlayerToQueue(campaignId, userId);
      }

      const currentTurn = await this.turnService.getCurrentTurn(campaignId);
      const currentPlayer = players.find((p) => p.userId === currentTurn);

      client.emit('campaign:joined', {
        campaignId,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
        },
        players,
        characters,
        currentTurn: currentPlayer || null,
        isYourTurn: currentTurn === userId,
      });

      // Notify others
      client.to(roomName).emit('player:joined', {
        userId,
        username,
        socketId: client.id,
      });
    } catch (error) {
      client.emit('error', { code: 'JOIN_FAILED', message: error.message });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('campaign:leave')
  async handleLeaveCampaign(
    @MessageBody() data: JoinCampaignDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { campaignId } = data;
    const userId = (client as any).user?.userId;
    const roomName = `campaign:${campaignId}`;

    client.leave(roomName);
    await this.gameService.removeActivePlayer(campaignId, client.id);
    await this.turnService.removePlayerFromQueue(campaignId, userId);

    client.emit('campaign:left', { campaignId });
    client.to(roomName).emit('player:left', { userId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('action:submit')
  async handleActionSubmit(
    @MessageBody() data: SubmitActionDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { campaignId, content, characterId } = data;
    const userId = (client as any).user?.userId;
    const roomName = `campaign:${campaignId}`;

    try {
      // Check if it's the player's turn
      const isTurn = await this.turnService.isPlayerTurn(campaignId, userId);
      if (!isTurn) {
        client.emit('error', { code: 'NOT_YOUR_TURN', message: 'It is not your turn' });
        return;
      }

      // Get active session
      const { campaign } = await this.gameService.getCampaignWithPlayers(campaignId);
      
      // For MVP, auto-start session if none exists
      let session = await this.gameService.startSession(campaignId);

      // Broadcast player action immediately
      const character = characterId 
        ? await this.charactersService.findOne(characterId).catch(() => null)
        : null;

      this.server.to(roomName).emit('action:received', {
        senderType: 'player',
        senderId: userId,
        characterId,
        characterName: character?.name,
        content,
        createdAt: new Date().toISOString(),
      });

      // Show DM is typing
      this.server.to(roomName).emit('dm:typing', {});

      // Generate DM response
      const dmMessage = await this.dmService.generateDmResponse(
        campaignId,
        session.id,
        content,
        characterId,
      );

      // Broadcast DM response
      this.server.to(roomName).emit('dm:response', {
        id: dmMessage.id,
        senderType: 'dm',
        content: dmMessage.content,
        createdAt: dmMessage.createdAt.toISOString(),
      });

      // Advance turn
      const nextPlayerId = await this.turnService.advanceTurn(campaignId);
      const { players } = await this.gameService.getCampaignWithPlayers(campaignId);
      const nextPlayer = players.find((p) => p.userId === nextPlayerId);

      if (nextPlayer) {
        this.server.to(roomName).emit('turn:changed', {
          userId: nextPlayerId,
          username: nextPlayer.username,
          displayName: nextPlayer.displayName,
        });
      }
    } catch (error) {
      console.error('Action submit error:', error);
      client.emit('error', { code: 'ACTION_FAILED', message: error.message });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() data: { campaignId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const username = (client as any).user?.username;
    const typingUsers = await this.gameService.setTyping(data.campaignId, username, true);
    
    this.server.to(`campaign:${data.campaignId}`).emit('typing:update', {
      usernames: typingUsers,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() data: { campaignId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const username = (client as any).user?.username;
    const typingUsers = await this.gameService.setTyping(data.campaignId, username, false);
    
    this.server.to(`campaign:${data.campaignId}`).emit('typing:update', {
      usernames: typingUsers,
    });
  }
}
