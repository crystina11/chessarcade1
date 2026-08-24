import * as THREE from 'three';
import { getWeapon, getArrow, getThrowable } from './WeaponData.js';

export class ProjectileSystem {
  constructor(scene, mapManager){
    this.scene=scene;
    this.mapManager=mapManager;
    this.projectiles=[];
    this.effects=[];
  }

  spawnBullet(origin, direction, weaponId, ownerId, arrowType=null){
    const w = getWeapon(weaponId);
    if(w.projectile){
      this.spawnProjectile(origin, direction, weaponId, ownerId, arrowType);
      return null;
    }
    // Hitscan handled elsewhere, but create tracer visual
    const tracerGeo = new THREE.BufferGeometry().setFromPoints([origin, origin.clone().add(direction.clone().multiplyScalar(w.range))]);
    const tracerMat = new THREE.LineBasicMaterial({ color: arrowType?getArrow(arrowType).color:0xFFD000, transparent:true, opacity:0.8 });
    const line = new THREE.Line(tracerGeo, tracerMat);
    this.scene.add(line);
    setTimeout(()=>this.scene.remove(line),80);
    return { origin, direction, weaponId, ownerId, arrowType };
  }

  spawnProjectile(origin, direction, weaponId, ownerId, arrowType=null){
    const w = getWeapon(weaponId);
    const arrow = arrowType?getArrow(arrowType):null;
    const group=new THREE.Group();

    let mesh;
    if(weaponId==='rpg'){
      const geo=new THREE.CylinderGeometry(0.12,0.15,0.9,8);
      const mat=new THREE.MeshToonMaterial({ color: 0xFF4D00 });
      mesh=new THREE.Mesh(geo, mat);
      mesh.rotation.x=Math.PI/2;
    } else if(weaponId==='bow'){
      const geo=new THREE.CylinderGeometry(0.02,0.02,1.2,6);
      const mat=new THREE.MeshToonMaterial({ color: new THREE.Color(arrow?.color||'#DDD') });
      mesh=new THREE.Mesh(geo, mat);
      mesh.rotation.x=Math.PI/2;
      // Arrowhead
      const headGeo=new THREE.ConeGeometry(0.08,0.25,6);
      const headMat=new THREE.MeshToonMaterial({ color: 0x111111 });
      const head=new THREE.Mesh(headGeo, headMat);
      head.position.z=0.7;
      head.rotation.x=Math.PI;
      mesh.add(head);
      // Trail
      const trailGeo=new THREE.BoxGeometry(0.02,0.02,0.4);
      const trailMat=new THREE.MeshBasicMaterial({ color: new THREE.Color(arrow?.color||'#FFD000'), transparent:true, opacity:0.6 });
      const trail=new THREE.Mesh(trailGeo, trailMat);
      trail.position.z=-0.6;
      mesh.add(trail);
    } else {
      const geo=new THREE.SphereGeometry(0.15,8,8);
      const mat=new THREE.MeshToonMaterial({ color: 0xFFD000 });
      mesh=new THREE.Mesh(geo, mat);
    }

    group.add(mesh);
    group.position.copy(origin);
    this.scene.add(group);

    const proj={
      id: Math.random().toString(36).slice(2),
      mesh: group,
      position: origin.clone(),
      velocity: direction.clone().normalize().multiplyScalar(w.projectileSpeed||25),
      weaponId, ownerId, arrowType,
      life: 6,
      damage: arrow?arrow.damage:w.damage,
      radius: arrow?.radius||w.radius||0,
      effect: arrow?.effect||null,
      arrowData: arrow,
      weaponData: w,
      type: weaponId==='bow'?'arrow':weaponId==='rpg'?'rocket':'projectile'
    };
    this.projectiles.push(proj);
    return proj;
  }

  spawnThrowable(origin, direction, throwableId, ownerId){
    const t = getThrowable(throwableId);
    const geo = throwableId==='grenade'? new THREE.SphereGeometry(0.18,10,8) :
                throwableId==='molly'? new THREE.CylinderGeometry(0.12,0.12,0.25,8) :
                throwableId==='smoke'? new THREE.SphereGeometry(0.2,8,8) :
                new THREE.BoxGeometry(0.3,0.2,0.15);
    const mat = new THREE.MeshToonMaterial({ color: new THREE.Color(t.color) });
    const mesh = new THREE.Mesh(geo, mat);
    const group=new THREE.Group();
    group.add(mesh);
    group.position.copy(origin);
    this.scene.add(group);

    const proj={
      id: Math.random().toString(36).slice(2),
      mesh: group,
      position: origin.clone(),
      velocity: direction.clone().normalize().multiplyScalar(9).add(new THREE.Vector3(0,5,0)),
      throwableId, ownerId,
      life: t.fuse||3,
      type: 'throwable',
      data: t,
      bounces:0,
      exploded:false
    };
    this.projectiles.push(proj);
    return proj;
  }

  update(dt, players, onHit){
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i];
      p.life-=dt;

      // Physics
      if(p.type==='throwable'){
        p.velocity.y-=9.8*dt;
        p.position.add(p.velocity.clone().multiplyScalar(dt));
        // Bounce
        if(p.position.y<=0.3){
          p.position.y=0.3;
          p.velocity.y*=-0.4;
          p.velocity.x*=0.7;
          p.velocity.z*=0.7;
          p.bounces++;
        }
        // Collision with obstacles
        if(this.mapManager){
          const col=this.mapManager.checkCollision(p.position,0.3);
          if(col.hit){
            p.velocity.x*=-0.5; p.velocity.z*=-0.5; p.bounces++;
          }
        }
      } else {
        // Projectile
        if(p.type!=='rocket') p.velocity.y-=2*dt; // slight drop for arrows
        p.position.add(p.velocity.clone().multiplyScalar(dt));
      }

      p.mesh.position.copy(p.position);
      if(p.type!=='throwable'){
        // Orient to velocity
        const dir=p.velocity.clone().normalize();
        p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), dir);
      } else {
        p.mesh.rotation.x+=dt*8; p.mesh.rotation.y+=dt*5;
      }

      // Hit players
      let hit=false;
      for(const player of players){
        if(player.id===p.ownerId) continue;
        if(player.isDead) continue;
        const dist=p.position.distanceTo(player.position.clone().add(new THREE.Vector3(0,1,0)));
        if(dist<1.0){
          // Hit
          const dmg=p.damage||20;
          const killed=player.takeDamage(dmg, p.ownerId);
          if(p.effect && player.applyEffect) player.applyEffect(p.effect, p.arrowData||{});
          if(onHit) onHit({ target: player, shooter: p.ownerId, damage: dmg, projectile: p, killed });
          // Effects
          if(p.radius>0){
            this.explode(p.position, p.radius, p.damage, p.ownerId, players, onHit);
          } else {
            this.createHitEffect(p.position, p.arrowData?.color||'#FFD000');
          }
          hit=true;
          break;
        }
      }
      if(hit || p.life<=0){
        // If throwable with radius and not yet exploded, explode
        if(p.type==='throwable' && !p.exploded){
          if(p.throwableId==='grenade' || p.life<=0){
            this.explode(p.position, p.data.radius||5, p.data.damage||80, p.ownerId, players, onHit);
            if(p.throwableId==='molly') this.createFireZone(p.position, p.data);
            if(p.throwableId==='smoke') this.createSmoke(p.position, p.data);
          } else if(p.throwableId==='molly'){
            this.createFireZone(p.position, p.data);
          } else if(p.throwableId==='smoke'){
            this.createSmoke(p.position, p.data);
          }
        } else if(p.type==='rocket' || p.radius>0){
          if(!hit) this.explode(p.position, p.radius, p.damage, p.ownerId, players, onHit);
        }
        this.scene.remove(p.mesh);
        this.projectiles.splice(i,1);
        continue;
      }

      // Ground collision for projectiles
      if(p.position.y<=0.2 && p.type!=='throwable'){
        if(p.radius>0){
          this.explode(p.position, p.radius, p.damage, p.ownerId, players, onHit);
        } else {
          this.createHitEffect(p.position, '#555');
        }
        this.scene.remove(p.mesh);
        this.projectiles.splice(i,1);
      }
    }

    // Update effects
    for(let i=this.effects.length-1;i>=0;i--){
      const e=this.effects[i];
      e.life-=dt;
      e.mesh.position.y+=dt*0.5;
      e.mesh.material.opacity-=dt*0.5;
      e.mesh.scale.multiplyScalar(1+dt*0.5);
      if(e.life<=0){
        this.scene.remove(e.mesh);
        this.effects.splice(i,1);
      }
    }
  }

  explode(pos, radius, damage, ownerId, players, onHit){
    // Visual
    const geo=new THREE.SphereGeometry(radius,16,12);
    const mat=new THREE.MeshBasicMaterial({ color: 0xFF4D00, transparent:true, opacity:0.7, wireframe:false });
    const mesh=new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.effects.push({ mesh, life:0.4 });

    // Inner core
    const coreGeo=new THREE.SphereGeometry(radius*0.5,12,10);
    const coreMat=new THREE.MeshBasicMaterial({ color: 0xFFD000, transparent:true, opacity:0.9 });
    const core=new THREE.Mesh(coreGeo, coreMat);
    core.position.copy(pos);
    this.scene.add(core);
    this.effects.push({ mesh: core, life:0.25 });

    // Damage nearby
    players.forEach(pl=>{
      if(pl.id===ownerId) return; // maybe self damage? allow 50%
      if(pl.isDead) return;
      const d=pl.position.distanceTo(pos);
      if(d<=radius){
        const falloff=1 - (d/radius);
        const dmg=damage*falloff;
        const killed=pl.takeDamage(dmg, ownerId);
        if(onHit) onHit({ target: pl, shooter: ownerId, damage: dmg, isExplosion:true, killed });
      }
    });

    // Screen shake handled by caller
  }

  createHitEffect(pos, color){
    const geo=new THREE.SphereGeometry(0.2,6,6);
    const mat=new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent:true, opacity:0.8 });
    const mesh=new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.effects.push({ mesh, life:0.3 });
  }

  createFireZone(pos, data){
    const geo=new THREE.CylinderGeometry(data.radius||4, data.radius||4, 0.2, 12);
    const mat=new THREE.MeshBasicMaterial({ color: 0xFF4D00, transparent:true, opacity:0.5 });
    const mesh=new THREE.Mesh(geo, mat);
    mesh.position.copy(pos); mesh.position.y=0.1;
    this.scene.add(mesh);
    this.effects.push({ mesh, life: data.duration||5 });
    // Damage over time handled via zone check outside
  }

  createSmoke(pos, data){
    const group=new THREE.Group();
    for(let i=0;i<8;i++){
      const geo=new THREE.SphereGeometry(1+Math.random()*1.5,8,8);
      const mat=new THREE.MeshBasicMaterial({ color: 0xAAAAAA, transparent:true, opacity:0.4 });
      const m=new THREE.Mesh(geo, mat);
      m.position.set((Math.random()-0.5)*4, Math.random()*2, (Math.random()-0.5)*4);
      group.add(m);
    }
    group.position.copy(pos);
    this.scene.add(group);
    this.effects.push({ mesh: group, life: data.duration||8 });
  }

  clear(){
    this.projectiles.forEach(p=>this.scene.remove(p.mesh));
    this.projectiles=[];
    this.effects.forEach(e=>this.scene.remove(e.mesh));
    this.effects=[];
  }
}
