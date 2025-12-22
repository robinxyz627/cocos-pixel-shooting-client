export enum FsmParamTypeEnum {
  Number = "Number",
  Trigger = "Trigger",
}

export enum ParamsNameEnum {
  Idle = "Idle",
  Run = "Run",
  Attack = "Attack",
}

export enum EventEnum {
  WeaponShoot = "WeaponShoot",
  ExplosionBorn = "ExplosionBorn",
  BulletBorn = "BulletBorn",
  ClintSync = "ClintSync",
  RoomSelect = "RoomSelect",//高亮点击的房间列表
  RoomJoin = "RoomJoin",    //点击加入房间按钮后
  

}

export enum PrefabPathEnum {
  Actor1 = "prefab/actor1",
  Actor2 = "prefab/actor2",
  Map = "prefab/map",
  Weapon1 = "prefab/weapon1",
  Bullet1 = "prefab/bullet1",
  Bullet2 = "prefab/bullet2",
  Explosion = "prefab/explosion",
}

export enum TexturePathEnum {
  Actor1Idle = "texture/actor/actor1/idle",
  Actor1Run = "texture/actor/actor1/run",
  Actor2Idle = "texture/actor/actor2/idle",
  Actor2Run = "texture/actor/actor2/run",
  Weapon1Idle = "texture/weapon/weapon1/idle",
  Weapon1Attack = "texture/weapon/weapon1/attack",
  Weapon2Idle = "texture/weapon/weapon2/idle",
  Weapon2Attack = "texture/weapon/weapon2/attack",
  Bullet2Idle = "texture/bullet/bullet2",
  Bullet1Idle = "texture/bullet/bullet1",
  ExplosionIdle = "texture/explosion",
}

export enum EntityStateEnum {
  Idle = "Idle",
  Run = "Run",
  Attack = "Attack",
}

export enum SceneEnum {
  Login = "login",
  Battle = "battle",
  Hall = "hall",
  Room = "room",
}