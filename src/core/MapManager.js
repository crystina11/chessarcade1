import * as THREE from 'three';
import { MAPS } from '../utils/constants.js';

export class MapManager {
  constructor(scene){
    this.scene = scene;
    this.currentMap = null;
    this.obstacles = [];
    this.colliders = [];
    this.spawnPoints = [];
    this.ground = null;
  }

  loadMap(mapId){
    this.clear();
    const mapData = MAPS[mapId] || MAPS.warehouse;
    this.currentMap = mapData;
    this.spawnPoints = mapData.spawnPoints;

    // Ground with comic grid
    const groundGeo = new THREE.PlaneGeometry(mapData.size*2, mapData.size*2, 20,20);
    const canvas = document.createElement('canvas');
    canvas.width=512; canvas.height=512;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#2A2A2A';
    ctx.fillRect(0,0,512,512);
    ctx.strokeStyle='#333';
    ctx.lineWidth=2;
    for(let i=0;i<512;i+=64){
      ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(512,i); ctx.stroke();
    }
    // Halftone
    ctx.fillStyle='rgba(0,0,0,0.1)';
    for(let x=0;x<512;x+=8) for(let y=0;y<512;y+=8) ctx.fillRect(x,y,2,2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(4,4);
    const groundMat = new THREE.MeshToonMaterial({ map: tex, color: 0x3a3a3a });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x=-Math.PI/2;
    this.ground.receiveShadow=true;
    this.ground.userData.isGround=true;
    this.scene.add(this.ground);

    // Outline for ground
    const gridHelper = new THREE.GridHelper(mapData.size*2, 20, 0xFFD000, 0x222222);
    gridHelper.position.y=0.02;
    this.scene.add(gridHelper);
    this.obstacles.push(gridHelper);

    // Obstacles
    mapData.obstacles.forEach(obs=>{
      const geo = new THREE.BoxGeometry(obs.size[0], obs.size[1], obs.size[2]);
      // Comic texture per box
      const c = new THREE.Color(obs.color);
      const mat = new THREE.MeshToonMaterial({ color: c, roughness:0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(obs.pos[0], obs.pos[1]+obs.size[1]/2, obs.pos[2]);
      mesh.castShadow=true; mesh.receiveShadow=true;
      mesh.userData.isObstacle=true;
      mesh.userData.box = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(obs.pos[0], obs.pos[1]+obs.size[1]/2, obs.pos[2]),
        new THREE.Vector3(obs.size[0], obs.size[1], obs.size[2])
      );
      this.scene.add(mesh);
      this.obstacles.push(mesh);
      this.colliders.push(mesh.userData.box);

      // Ink outline - second slightly bigger black mesh with backface culling inverted
      const outlineGeo = new THREE.BoxGeometry(obs.size[0]+0.15, obs.size[1]+0.15, obs.size[2]+0.15);
      const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.BackSide });
      const outline = new THREE.Mesh(outlineGeo, outlineMat);
      outline.position.copy(mesh.position);
      this.scene.add(outline);
      this.obstacles.push(outline);
    });

    // Comic props - barrels, crates with POW style
    for(let i=0;i<6;i++){
      const isBarrel = Math.random()>0.5;
      let prop;
      if(isBarrel){
        const geo = new THREE.CylinderGeometry(0.8,0.8,1.6,8);
        const mat = new THREE.MeshToonMaterial({ color: Math.random()>0.5?0x8B0000:0x1A3A5A });
        prop = new THREE.Mesh(geo, mat);
      } else {
        const geo = new THREE.BoxGeometry(1.5,1.5,1.5);
        const mat = new THREE.MeshToonMaterial({ color: 0x5A4A2A });
        prop = new THREE.Mesh(geo, mat);
      }
      const angle = (i/6)*Math.PI*2;
      const radius = 8+Math.random()*12;
      prop.position.set(Math.cos(angle)*radius, 0.8, Math.sin(angle)*radius);
      prop.castShadow=true;
      prop.userData.isObstacle=true;
      prop.userData.box = new THREE.Box3().setFromCenterAndSize(prop.position, new THREE.Vector3(1.5,1.5,1.5));
      this.scene.add(prop);
      this.obstacles.push(prop);
      this.colliders.push(prop.userData.box);
    }

    // Skybox comic gradient
    const skyGeo = new THREE.SphereGeometry(200, 16,16);
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width=512; skyCanvas.height=512;
    const sctx=skyCanvas.getContext('2d');
    const grad=sctx.createLinearGradient(0,0,0,512);
    grad.addColorStop(0,'#FF4D00'); grad.addColorStop(0.5,'#1a1a2e'); grad.addColorStop(1,'#0a0a0a');
    sctx.fillStyle=grad; sctx.fillRect(0,0,512,512);
    // Clouds halftone
    sctx.fillStyle='rgba(255,255,255,0.05)';
    for(let i=0;i<100;i++){
      sctx.beginPath(); sctx.arc(Math.random()*512, Math.random()*200, Math.random()*30+10,0,Math.PI*2); sctx.fill();
    }
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
    this.obstacles.push(sky);

    return mapData;
  }

  getSpawnPoint(index=0){
    const pts = this.spawnPoints;
    const p = pts[index % pts.length];
    return new THREE.Vector3(p[0], p[1]+1.5, p[2]);
  }

  checkCollision(pos, radius=0.6){
    // ground is infinite, only check obstacles
    for(const box of this.colliders){
      const closest = new THREE.Vector3();
      box.clampPoint(pos, closest);
      if(closest.distanceTo(pos) < radius){
        return { hit:true, closest, box };
      }
    }
    // bounds
    const size = this.currentMap?.size || 60;
    if(Math.abs(pos.x)>size || Math.abs(pos.z)>size){
      return { hit:true, isBounds:true };
    }
    return { hit:false };
  }

  clear(){
    this.obstacles.forEach(o=>this.scene.remove(o));
    this.obstacles=[]; this.colliders=[];
    if(this.ground){ this.scene.remove(this.ground); this.ground=null; }
  }
}
