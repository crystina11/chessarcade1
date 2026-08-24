import { AVATARS, WEAPONS, THROWABLES, ARROW_TYPES } from '../utils/constants.js';

export class UIManager {
  constructor(game){
    this.game=game;
    this.profileScreen=document.getElementById('profileScreen');
    this.mainMenu=document.getElementById('mainMenu');
    this.loadoutScreen=document.getElementById('loadoutScreen');
    this.lobbyScreen=document.getElementById('lobbyScreen');
    this.hud=document.getElementById('hud');
    this.mobileControls=document.getElementById('mobileControls');
    this.pauseScreen=document.getElementById('pauseScreen');

    this.playerNameInput=document.getElementById('playerNameInput');
    this.avatarGrid=document.getElementById('avatarGrid');
    this.loadoutGrid=document.getElementById('loadoutGrid');

    this.currentAvatar='punk';
    this.loadout={
      primary:'m4',
      secondary:'glock',
      lethal:'grenade',
      tactical:'smoke',
      arrowType:'standard'
    };

    this.setupAvatars();
    this.setupLoadout();
    this.setupEvents();
    this.setupMobile();
  }

  setupAvatars(){
    this.avatarGrid.innerHTML='';
    AVATARS.forEach(av=>{
      const card=document.createElement('div');
      card.className='avatar-card'+(av.id===this.currentAvatar?' selected':'');
      card.dataset.id=av.id;
      card.innerHTML=`
        <div class="avatar-img" style="background: linear-gradient(135deg, ${av.color}, #111)">${av.char}</div>
        <div class="avatar-name">${av.name}</div>
        <div style="font-size:0.6rem;font-weight:800;opacity:0.6">${av.desc}</div>
      `;
      card.onclick=()=>{
        this.currentAvatar=av.id;
        this.avatarGrid.querySelectorAll('.avatar-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
      };
      this.avatarGrid.appendChild(card);
    });
  }

  setupLoadout(){
    const categories=[
      { id:'primary', title:'PRIMARY WEAPON', items: Object.values(WEAPONS).filter(w=>w.slot==='primary') },
      { id:'secondary', title:'SECONDARY', items: Object.values(WEAPONS).filter(w=>w.slot==='secondary') },
      { id:'lethal', title:'LETHAL', items: Object.values(THROWABLES).filter(t=>['grenade','molly'].includes(t.id)) },
      { id:'tactical', title:'TACTICAL', items: Object.values(THROWABLES).filter(t=>['smoke','medkit'].includes(t.id)) },
      { id:'arrowType', title:'ARROW TYPE (FOR BOW)', items: Object.values(ARROW_TYPES) }
    ];
    this.loadoutGrid.innerHTML='';
    categories.forEach(cat=>{
      const div=document.createElement('div');
      div.className='weapon-category';
      div.innerHTML=`<h4>${cat.title}</h4>`;
      cat.items.forEach(item=>{
        const isSelected=this.loadout[cat.id]===item.id;
        const opt=document.createElement('div');
        opt.className='weapon-option'+(isSelected?' selected':'');
        opt.dataset.cat=cat.id;
        opt.dataset.id=item.id;
        const stats=item.stats?`
          <div style="display:flex;gap:4px;margin-top:4px">
            <div style="flex:1"><div style="font-size:0.6rem">DMG</div><div class="stat-bar"><div class="stat-fill" style="width:${item.stats.dmg}%"></div></div></div>
            <div style="flex:1"><div style="font-size:0.6rem">ROF</div><div class="stat-bar"><div class="stat-fill" style="width:${item.stats.firerate}%"></div></div></div>
          </div>
        `:'';
        opt.innerHTML=`
          <div>
            <div>${item.icon||''} ${item.name}</div>
            <small>${item.type||item.effect||''} • ${item.mag? item.mag+' mag' : item.count? item.count+'x' : ''}</small>
            ${stats}
          </div>
          <div style="font-size:1.2rem">${isSelected?'✓':''}</div>
        `;
        opt.onclick=()=>{
          this.loadout[cat.id]=item.id;
          div.querySelectorAll('.weapon-option').forEach(o=>o.classList.remove('selected'));
          opt.classList.add('selected');
          // Update checkmarks
          div.querySelectorAll('.weapon-option').forEach(o=>{
            o.querySelector('div:last-child').textContent = o.dataset.id===this.loadout[cat.id] ? '✓' : '';
          });
          this.updateLoadoutSummary();
        };
        div.appendChild(opt);
      });
      this.loadoutGrid.appendChild(div);
    });
    this.updateLoadoutSummary();
  }

  updateLoadoutSummary(){
    const sum=document.getElementById('loadoutSummary');
    if(sum){
      const p=WEAPONS[this.loadout.primary]?.name||this.loadout.primary;
      const s=WEAPONS[this.loadout.secondary]?.name||this.loadout.secondary;
      const l=THROWABLES[this.loadout.lethal]?.name||this.loadout.lethal;
      sum.textContent=`${p} + ${s} + ${l} + ${this.loadout.arrowType.toUpperCase()} ARROWS`;
    }
  }

  setupEvents(){
    document.getElementById('enterGameBtn').onclick=()=>{
      const name=this.playerNameInput.value.trim()||'PUNK-01';
      this.game.setProfile(name, this.currentAvatar);
      this.showScreen('mainMenu');
      document.getElementById('playerStatusDisplay').textContent=`${name} • ${this.currentAvatar.toUpperCase()} • READY`;
    };

    document.getElementById('openLoadoutBtn').onclick=()=>this.showScreen('loadoutScreen');
    document.getElementById('closeLoadoutBtn').onclick=()=>this.showScreen('mainMenu');
    document.getElementById('openProfileBtn').onclick=()=>this.showScreen('profileScreen');
    document.getElementById('saveLoadoutBtn').onclick=()=>{
      this.game.setLoadout(this.loadout);
      this.showScreen('mainMenu');
    };

    // Main menu cards
    document.getElementById('playOnlineCard').onclick=()=>{
      this.showScreen('lobbyScreen');
      document.getElementById('p2pStatus').textContent='Ready - create or join room';
    };
    document.getElementById('playBotCard').onclick=()=>{
      this.game.setLoadout(this.loadout);
      this.game.startMatch({ map:'warehouse', mode:'ffa', isMultiplayer:false, botCount:5 });
    };
    document.getElementById('gunGameCard').onclick=()=>{
      this.game.setLoadout(this.loadout);
      this.game.startMatch({ map:'warehouse', mode:'gungame', isMultiplayer:false, botCount:5 });
    };
    document.querySelectorAll('[data-map]').forEach(btn=>{
      btn.onclick=(e)=>{
        e.stopPropagation();
        const map=btn.dataset.map;
        this.game.setLoadout(this.loadout);
        this.game.startMatch({ map, mode:'ffa', isMultiplayer:false, botCount:5 });
      };
    });

    // Lobby
    document.getElementById('createRoomBtn').onclick=async()=>{
      const code=await this.game.multiplayer.createRoom();
      document.getElementById('roomCodeDisplay').textContent=code;
      document.getElementById('p2pStatus').textContent=`Room ${code} created - waiting for peers via torrent trackers...`;
      this.updatePlayerList();
    };
    document.getElementById('joinRoomBtn').onclick=async()=>{
      const code=document.getElementById('joinCodeInput').value.trim().toUpperCase();
      if(!code) return;
      document.getElementById('p2pStatus').textContent='Joining... connecting to trackers (may take 10-20s)';
      try{
        await this.game.multiplayer.joinRoom(code);
        document.getElementById('roomCodeDisplay').textContent=code;
        document.getElementById('p2pStatus').textContent=`Joined ${code} - waiting for host to start`;
        this.updatePlayerList();
      }catch(err){
        document.getElementById('p2pStatus').textContent='Failed to join - check code';
      }
    };
    document.getElementById('roomCodeDisplay').onclick=()=>{
      const code=document.getElementById('roomCodeDisplay').textContent;
      if(code && code!=='----'){
        navigator.clipboard.writeText(code);
        this.showPow('CODE COPIED!', { x:0, y:0, z:0 });
      }
    };
    document.getElementById('leaveLobbyBtn').onclick=()=>{
      this.game.multiplayer.leave();
      this.showScreen('mainMenu');
    };
    document.getElementById('startMatchBtn').onclick=()=>{
      const map=document.querySelector('.mapBtn.active')?.dataset.map||'warehouse';
      const mode=document.querySelector('.modeBtn.active')?.dataset.mode||'ffa';
      this.game.multiplayer.sendGameEvent({ type:'start', map, mode });
      this.game.startMatch({ map, mode, isMultiplayer:true });
    };
    document.querySelectorAll('.modeBtn').forEach(btn=>{
      btn.onclick=()=>{
        document.querySelectorAll('.modeBtn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('lobbyModeDisplay').textContent=btn.textContent;
      };
    });
    document.querySelectorAll('.mapBtn').forEach(btn=>{
      btn.onclick=()=>{
        document.querySelectorAll('.mapBtn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
      };
    });

    // HUD
    document.getElementById('hudMenuBtn').onclick=()=>this.showScreen('pauseScreen');
    document.getElementById('resumeBtn').onclick=()=>{
      this.showHUD();
      this.game.resume();
    };
    document.getElementById('pauseLoadoutBtn').onclick=()=>{
      this.showScreen('loadoutScreen');
    };
    document.getElementById('pauseLobbyBtn').onclick=()=>{
      this.game.multiplayer.leave();
      this.game.gameState='menu';
      this.showScreen('mainMenu');
    };
    document.getElementById('quitBtn').onclick=()=>{
      this.game.gameState='menu';
      this.showScreen('mainMenu');
    };

    // Keyboard pause
    window.addEventListener('keydown', e=>{
      if(e.code==='Escape'){
        if(this.game.gameState==='playing'){
          this.game.pause();
          this.showScreen('pauseScreen');
        } else if(this.game.gameState==='paused'){
          this.showHUD();
          this.game.resume();
        }
      }
    });

    // Multiplayer UI updates
    if(this.game.multiplayer){
      this.game.multiplayer.on('onPeerJoin', ()=>this.updatePlayerList());
      this.game.multiplayer.on('onPeerLeave', ()=>this.updatePlayerList());
      this.game.multiplayer.on('onPlayerJoin', ()=>this.updatePlayerList());
      this.game.multiplayer.on('onConnected', (code)=>{
        document.getElementById('roomCodeDisplay').textContent=code;
        this.updatePlayerList();
      });
    }
  }

  setupMobile(){
    // Simple joystick via touch
    const moveZone=document.getElementById('moveJoystick');
    const aimZone=document.getElementById('aimJoystick');
    if(!moveZone || !aimZone) return;

    const setupJoystick=(element, onMove)=>{
      let startX=0, startY=0, active=false;
      const handleMove=(x,y)=>{
        const rect=element.getBoundingClientRect();
        const cx=rect.left+rect.width/2;
        const cy=rect.top+rect.height/2;
        let dx=(x-cx)/ (rect.width/2);
        let dy=(y-cy)/ (rect.height/2);
        const len=Math.sqrt(dx*dx+dy*dy);
        if(len>1){ dx/=len; dy/=len; }
        onMove(dx, -dy, len>0.2);
      };
      element.addEventListener('touchstart', e=>{
        active=true;
        const t=e.touches[0];
        startX=t.clientX; startY=t.clientY;
        handleMove(t.clientX, t.clientY);
      }, { passive:false });
      element.addEventListener('touchmove', e=>{
        if(!active) return;
        e.preventDefault();
        const t=e.touches[0];
        handleMove(t.clientX, t.clientY);
      }, { passive:false });
      element.addEventListener('touchend', e=>{
        active=false;
        onMove(0,0,false);
      });
      // Mouse fallback
      element.addEventListener('mousedown', e=>{
        active=true;
        handleMove(e.clientX, e.clientY);
        const mm=(ev)=>handleMove(ev.clientX, ev.clientY);
        const mu=()=>{
          active=false;
          onMove(0,0,false);
          window.removeEventListener('mousemove', mm);
          window.removeEventListener('mouseup', mu);
        };
        window.addEventListener('mousemove', mm);
        window.addEventListener('mouseup', mu);
      });
    };

    setupJoystick(moveZone, (x,y,active)=>{
      this.game.controls.mobileMove.set(x,y);
    });
    setupJoystick(aimZone, (x,y,active)=>{
      this.game.controls.mobileAim.set(x*1.5,y*1.5);
      if(active && Math.abs(x)>0.3 || Math.abs(y)>0.3){
        // Tap to shoot handled via separate button but also allow
        if(Math.random()>0.7) this.game.controls.mouse.down=true;
        else this.game.controls.mouse.down=false;
      }
    });

    // Also tap on aim zone to shoot
    aimZone.addEventListener('touchstart', ()=>{ this.game.controls.mouse.down=true; });
    aimZone.addEventListener('touchend', ()=>{ this.game.controls.mouse.down=false; });

    // Mobile buttons
    const bindBtn=(id, keyCode, action)=>{
      const el=document.getElementById(id);
      if(!el) return;
      const down=()=>{ if(keyCode) this.game.controls.keys[keyCode]=true; if(action) action(true); };
      const up=()=>{ if(keyCode) this.game.controls.keys[keyCode]=false; if(action) action(false); };
      el.addEventListener('touchstart', (e)=>{ e.preventDefault(); down(); }, { passive:false });
      el.addEventListener('touchend', (e)=>{ e.preventDefault(); up(); }, { passive:false });
      el.addEventListener('mousedown', down);
      el.addEventListener('mouseup', up);
    };
    bindBtn('mJump','Space');
    bindBtn('mDash',null,(down)=>{ if(down){ const mv=this.game.controls.getMoveVector(); this.game.localPlayer?.dash({x:mv.x, y:mv.y}); }});
    bindBtn('mReload','KeyR');
    bindBtn('mSwitch','KeyQ');
    bindBtn('mGrenade','KeyG');
    bindBtn('mTactical','KeyF');

    // Add shoot button overlay
    const shootBtn=document.createElement('button');
    shootBtn.className='m-btn danger';
    shootBtn.style.position='absolute';
    shootBtn.style.right='20px';
    shootBtn.style.bottom='320px';
    shootBtn.style.width='80px'; shootBtn.style.height='80px';
    shootBtn.style.fontSize='1rem';
    shootBtn.textContent='FIRE';
    shootBtn.id='mShoot';
    document.getElementById('mobileControls').appendChild(shootBtn);
    bindBtn('mShoot',null,(down)=>{ this.game.controls.mouse.down=down; });
  }

  showScreen(name){
    ['profileScreen','mainMenu','loadoutScreen','lobbyScreen','pauseScreen'].forEach(id=>{
      document.getElementById(id).classList.add('hidden');
    });
    this.hud.classList.add('hidden');
    this.mobileControls.classList.add('hidden');

    if(name==='hud'){
      this.hud.classList.remove('hidden');
      this.mobileControls.classList.remove('hidden');
    } else {
      const el=document.getElementById(name);
      if(el) el.classList.remove('hidden');
    }
  }

  showHUD(){
    this.showScreen('hud');
  }

  updatePlayerList(){
    const list=document.getElementById('playerList');
    const count=document.getElementById('playerCount');
    if(!list) return;
    list.innerHTML='';
    // Local
    const localDiv=document.createElement('div');
    localDiv.className='player-row';
    localDiv.innerHTML=`<div class="player-dot" style="background:${this.game.localAvatar?.color||'#FFD000'}"></div><div>${this.game.playerName} (YOU) ${this.game.multiplayer?.isHost?'👑':''}</div>`;
    list.appendChild(localDiv);
    // Peers
    const peers=this.game.multiplayer?.getPeers()||[];
    peers.forEach(p=>{
      const div=document.createElement('div');
      div.className='player-row';
      div.innerHTML=`<div class="player-dot" style="background:${p.avatar? (AVATARS.find(a=>a.id===p.avatar)?.color||'#00D5FF') : '#00D5FF'}"></div><div>${p.name||p.id.slice(0,4)} ${p.id===this.game.multiplayer?.roomCode?'':''}</div><div style="margin-left:auto;font-size:0.7rem">${p.health||100} HP</div>`;
      list.appendChild(div);
    });
    if(count) count.textContent= (peers.length+1).toString();
  }

  updateHUD(data){
    const healthFill=document.getElementById('healthFill');
    const healthText=document.getElementById('healthText');
    const armorText=document.getElementById('armorText');
    const killsText=document.getElementById('killsText');
    const ammoCurrent=document.getElementById('ammoCurrent');
    const ammoReserve=document.getElementById('ammoReserve');
    const weaponName=document.getElementById('weaponName');
    const timeDisplay=document.getElementById('timeDisplay');
    const aliveDisplay=document.getElementById('aliveDisplay');

    if(healthFill) healthFill.style.width=`${Math.max(0,data.health)}%`;
    if(healthText) healthText.textContent=Math.ceil(data.health).toString();
    if(armorText) armorText.textContent=Math.ceil(data.armor).toString();
    if(killsText) killsText.textContent=data.kills.toString();
    if(data.ammo){
      if(ammoCurrent) ammoCurrent.textContent=data.ammo.current.toString();
      if(ammoReserve) ammoReserve.textContent=data.ammo.reserve.toString();
    }
    if(weaponName && data.weapon) weaponName.textContent=data.weapon.name;
    if(timeDisplay){
      const m=Math.floor(data.time/60).toString().padStart(2,'0');
      const s=Math.floor(data.time%60).toString().padStart(2,'0');
      timeDisplay.textContent=`${m}:${s}`;
    }
    if(aliveDisplay) aliveDisplay.textContent=data.alive.toString();
  }

  updateWeaponUI(weaponSystem){
    const cur=weaponSystem.getCurrentWeaponId();
    document.querySelectorAll('.w-slot').forEach(el=>el.classList.remove('active'));
    const slot=weaponSystem.currentSlot;
    const el=document.getElementById(`slot${slot.charAt(0).toUpperCase()+slot.slice(1)}`);
    if(el) el.classList.add('active');

    // Update slot texts
    const primary=document.getElementById('slotPrimary');
    const secondary=document.getElementById('slotSecondary');
    const lethal=document.getElementById('slotLethal');
    const tactical=document.getElementById('slotTactical');
    if(primary) primary.textContent=(WEAPONS[weaponSystem.primary]?.name||'M4').substring(0,4);
    if(secondary) secondary.textContent=(WEAPONS[weaponSystem.secondary]?.name||'GLOCK').substring(0,5);
    if(lethal) lethal.textContent=(THROWABLES[weaponSystem.lethal]?.name||'GREN').substring(0,4);
    if(tactical) tactical.textContent=(THROWABLES[weaponSystem.tactical]?.name||'SMOKE').substring(0,5);

    this.updateHUD({
      health: this.game.localPlayer?.health||100,
      armor: this.game.localPlayer?.armor||0,
      ammo: weaponSystem.ammo[cur],
      weapon: weaponSystem.getCurrentWeapon(),
      kills: this.game.localPlayer?.kills||0,
      time: this.game.matchTimer,
      alive: 1
    });
  }

  updateMapInfo(map, mode){
    document.getElementById('mapNameDisplay').textContent=map.toUpperCase();
    document.getElementById('modeDisplay').textContent=mode.toUpperCase();
  }

  updateMinimap(players, localPlayer, mapSize){
    const minimap=document.getElementById('minimap');
    if(!minimap) return;
    minimap.innerHTML='';
    // Background grid
    const size=mapSize||60;
    players.forEach(p=>{
      const dot=document.createElement('div');
      dot.className='minimap-dot';
      const isLocal=p.id==='local' || p===localPlayer;
      dot.style.background=isLocal? '#FFD000' : p.isBot? '#FF4D00' : '#00D5FF';
      dot.style.width=isLocal?'10px':'8px';
      dot.style.height=isLocal?'10px':'8px';
      const x=((p.position.x/size)+0.5)*100;
      const z=((p.position.z/size)+0.5)*100;
      dot.style.left=`${x}%`;
      dot.style.top=`${z}%`;
      minimap.appendChild(dot);
    });
  }

  showHitmarker(isKill=false){
    const hm=document.getElementById('hitmarker');
    if(!hm) return;
    hm.textContent=isKill?'KILL!':'HIT!';
    hm.style.color=isKill?'#FF1A1A':'#FFD000';
    hm.classList.remove('show');
    void hm.offsetWidth;
    hm.classList.add('show');
  }

  showCrosshairRecoil(){
    const ch=document.querySelector('.crosshair');
    if(!ch) return;
    ch.style.transform='translate(-50%,-50%) scale(1.4)';
    setTimeout(()=>{ ch.style.transform='translate(-50%,-50%) scale(1)'; },80);
  }

  addKillFeed(killer, victim, weapon){
    const feed=document.getElementById('killfeed');
    if(!feed) return;
    const item=document.createElement('div');
    item.className='kill-item';
    item.innerHTML=`${killer} <span style="color:white">[${weapon}]</span> ${victim}`;
    feed.appendChild(item);
    setTimeout(()=>{ item.remove(); },4000);
    if(feed.children.length>5) feed.firstChild.remove();
  }

  showPow(text, pos){
    // pos can be Vector3 or dummy
    const div=document.createElement('div');
    div.className='pow';
    div.textContent=text;
    div.style.left='50%';
    div.style.top='45%';
    if(pos && pos.x!==undefined){
      // Project world pos to screen if game exists
      if(this.game && this.game.camera){
        // Fallback centered
      }
    }
    document.body.appendChild(div);
    setTimeout(()=>div.remove(),600);
  }

  showEndScreen(title, kills){
    const pause=document.getElementById('pauseScreen');
    pause.classList.remove('hidden');
    pause.querySelector('.panel-header').textContent=title;
    const body=pause.querySelector('div[style*="padding:20px"]');
    if(body){
      const existing=body.querySelector('.end-stats');
      if(existing) existing.remove();
      const stats=document.createElement('div');
      stats.className='end-stats';
      stats.style.cssText='background:var(--yellow);border:4px solid var(--ink);padding:12px;font-family:Black Ops One;text-align:center;margin-bottom:10px';
      stats.innerHTML=`<div style="font-size:1.5rem">KILLS: ${kills}</div><div style="font-size:0.9rem">MATCH OVER - WELL FOUGHT!</div>`;
      body.prepend(stats);
    }
  }
}
