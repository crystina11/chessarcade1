import { joinRoom, selfId } from 'trystero/torrent';

export class Multiplayer {
  constructor(){
    this.room=null;
    this.roomCode=null;
    this.isHost=false;
    this.peers=new Map();
    this.localId=selfId;
    this.callbacks={};
    this.connected=false;
    this.actions={};
  }

  generateCode(){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code='';
    for(let i=0;i<4;i++) code+=chars[Math.floor(Math.random()*chars.length)];
    return code;
  }

  async createRoom(code=null){
    this.roomCode=code||this.generateCode();
    const config={ appId: 'shank-arena-v1-'+this.roomCode, password: this.roomCode };
    // torrent strategy
    this.room=joinRoom(config, 'shank-arena-'+this.roomCode);
    this.isHost=true;
    this.setupRoom();
    return this.roomCode;
  }

  async joinRoom(code){
    this.roomCode=code.toUpperCase();
    const config={ appId: 'shank-arena-v1-'+this.roomCode, password: this.roomCode };
    this.room=joinRoom(config, 'shank-arena-'+this.roomCode);
    this.isHost=false;
    this.setupRoom();
    return this.roomCode;
  }

  setupRoom(){
    if(!this.room) return;
    const [sendPlayer, getPlayer]=this.room.makeAction('player');
    const [sendShoot, getShoot]=this.room.makeAction('shoot');
    const [sendHit, getHit]=this.room.makeAction('hit');
    const [sendChat, getChat]=this.room.makeAction('chat');
    const [sendProjectile, getProjectile]=this.room.makeAction('projectile');
    const [sendGame, getGame]=this.room.makeAction('game');
    const [sendJoin, getJoin]=this.room.makeAction('join');

    this.actions={ sendPlayer, sendShoot, sendHit, sendChat, sendProjectile, sendGame, sendJoin };

    this.room.onPeerJoin(id=>{
      console.log('Peer joined', id);
      this.peers.set(id,{ id, lastSeen:Date.now() });
      if(this.callbacks.onPeerJoin) this.callbacks.onPeerJoin(id);
      // Send join info
      sendJoin({ id: selfId, name: this.localName||'PLAYER', avatar: this.localAvatar });
    });
    this.room.onPeerLeave(id=>{
      console.log('Peer left', id);
      this.peers.delete(id);
      if(this.callbacks.onPeerLeave) this.callbacks.onPeerLeave(id);
    });

    getPlayer((data, peerId)=>{
      if(this.callbacks.onPlayerUpdate) this.callbacks.onPlayerUpdate(data, peerId);
      const p=this.peers.get(peerId);
      if(p){ p.lastSeen=Date.now(); Object.assign(p, data); }
      else this.peers.set(peerId,{ id:peerId, ...data, lastSeen:Date.now() });
    });

    getShoot((data, peerId)=>{
      if(this.callbacks.onShoot) this.callbacks.onShoot(data, peerId);
    });

    getHit((data, peerId)=>{
      if(this.callbacks.onHit) this.callbacks.onHit(data, peerId);
    });

    getProjectile((data, peerId)=>{
      if(this.callbacks.onProjectile) this.callbacks.onProjectile(data, peerId);
    });

    getGame((data, peerId)=>{
      if(this.callbacks.onGameEvent) this.callbacks.onGameEvent(data, peerId);
    });

    getJoin((data, peerId)=>{
      if(!this.peers.has(peerId)) this.peers.set(peerId,{ id:peerId, ...data });
      if(this.callbacks.onPlayerJoin) this.callbacks.onPlayerJoin(data, peerId);
    });

    getChat((data, peerId)=>{
      if(this.callbacks.onChat) this.callbacks.onChat(data, peerId);
    });

    this.connected=true;
    if(this.callbacks.onConnected) this.callbacks.onConnected(this.roomCode);
  }

  setLocalInfo(name, avatar){
    this.localName=name; this.localAvatar=avatar;
  }

  sendPlayerUpdate(data){
    if(this.actions.sendPlayer) this.actions.sendPlayer(data);
  }
  sendShoot(data){
    if(this.actions.sendShoot) this.actions.sendShoot(data);
  }
  sendHit(data){
    if(this.actions.sendHit) this.actions.sendHit(data);
  }
  sendProjectile(data){
    if(this.actions.sendProjectile) this.actions.sendProjectile(data);
  }
  sendGameEvent(data){
    if(this.actions.sendGame) this.actions.sendGame(data);
  }
  sendChat(data){
    if(this.actions.sendChat) this.actions.sendChat(data);
  }

  on(event, cb){ this.callbacks[event]=cb; }

  leave(){
    if(this.room) this.room.leave();
    this.room=null; this.peers.clear(); this.connected=false; this.roomCode=null;
  }

  getPeerCount(){ return this.peers.size+1; }
  getPeers(){ return Array.from(this.peers.values()); }
}
