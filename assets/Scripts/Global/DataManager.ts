import { Prefab, SpriteFrame, Node, Vec2, Texture2D } from "cc";
import Singleton from "../Base/Singleton";
import { IActorMove, IBullet, IClientInput, IState, ITimePast, IWeaponShoot } from "../Common/State";
import { ActorManager } from "../Entity/Actor/ActorManager";
import { joyStickManager } from "../UI/joyStickManager";
import { EntityTypeEnum, InputTypeEnum } from "../Common/Enum";
import { BulletManager } from "../Entity/Bullet/BulletManager";
import EventManager from "./EventManager";
import { EventEnum } from "../Enum/Enum";
import { IRoom } from "../Common/Api";
import { toFixed } from "../Common/toFix";
import { fakeRandom } from "../Utils/Utils";


const ACTORSPEED = 100;
const BULLETSPEED = 500;
const COLLIDER_DISTANCE = 50;
const WINDOW_SIZE = { width: 1280, height: 720 };

export default class DataManager extends Singleton {
  static get Instance() {
    return super.GetInstance<DataManager>();
  }
  /**
   * 本机玩家id
   */
  playerId: number = 0;//登陆获取，暂时设置为0
  /**
   * 帧id
   */
  frameId: number = 1;//用于帧同步
  /**
   * 本机所在的房间info
   */
  roomInfo: IRoom = null;
  /**
   * 玩家 joyStickManager引用
   */
  jsm: joyStickManager = null;
  /**
   * 舞台节点引用
   */
  stage: Node = null;

  /**
   * 舞台节点引用
   */
  userTexture: Texture2D = null;

  lastState: IState = null;
  /**
   * 同步状态
   */
  state: IState = {
    actors: [
      {
        userId: 0,
        hp: 100,
        type: EntityTypeEnum.Actor1,
        weaponType: EntityTypeEnum.Weapon1,
        bulletType: EntityTypeEnum.Bullet2,
        position: {
          x: -150,
          y: -150
        },
        direction: {
          x: 1,
          y: 0
        },

      },
      {
        userId: 1,
        hp: 100,
        type: EntityTypeEnum.Actor2,
        weaponType: EntityTypeEnum.Weapon1,
        bulletType: EntityTypeEnum.Bullet2,
        position: {
          x: 200,
          y: 200
        },
        direction: {
          x: -1,
          y: 0
        },

      },
    ],
    bullets: [],
    nextBulletId: 1,
    seed: 13405,
  };
  /**
   * type [userId,ActorManager]
   */
  actorMap: Map<number, ActorManager> = new Map();
  /**
 * type [userId,BulletManager]
 */
  bulletMap: Map<number, BulletManager> = new Map();
  /**
   * type [PrefabPathEnum->type,Prefab]
   */
  prefabMap: Map<string, Prefab> = new Map();
  /**
   * type [TexturePathEnum->type,Array<SpriteFrame>]
   */
  textureMap: Map<string, Array<SpriteFrame>> = new Map();

  /**
   * 接收ICLientInput接口类型的输入
   */
  applyInput(input: IClientInput) {
    switch (input.type) {
      case InputTypeEnum.ActorMove:
        this.applyActorMove(input);
        break;
      case InputTypeEnum.WeaponShoot:
        this.applyWeaponShoot(input);
        break;
      case InputTypeEnum.TimePast:
        this.applyTimePast(input);
        break;
    }
  }

  applyActorMove(input: IActorMove) {
    const {
      userId,
      type,
      direction: { x, y },
      dt,
    } = input;
    const actor = this.state.actors.find(item => item.userId === userId);
    if (actor) {
      actor.direction.x = x;
      actor.direction.y = y;
      actor.position.x += toFixed(x * dt * ACTORSPEED);
      actor.position.y += toFixed(y * dt * ACTORSPEED);
      const actorCp = this.actorMap.get(userId);
      actorCp.feedDog();
    }
  }
  applyWeaponShoot(input: IWeaponShoot) {
    const {
      owner,
      position,
      direction,
    } = input;
    const bullet: IBullet = {
      id: this.state.nextBulletId++,
      owner,
      range: 1000,
      damage: 5,
      initPosition: { ...position },
      position,
      direction,
      type: this.actorMap.get(owner).bulletType,
      reboundPoints:[],
    };
    DataManager.Instance.state.bullets.push(bullet);
    //子弹发射动画（枪口火焰）
    EventManager.dispatch(EventEnum.BulletBorn, owner);
    console.log("发射子弹->", bullet);
  }

  applyTimePast(input: ITimePast) {
    const { dt } = input;
    const { bullets, actors } = this.state;

    //倒序遍历并销毁超出范围的子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      for (let j = actors.length - 1; j >= 0; j--) {
        const actor = actors[j];
        if (actor.userId === bullet.owner) continue;//忽略自己
        if (Vec2.distance(bullet.position, actor.position) < COLLIDER_DISTANCE) {
          //击中目标
          EventManager.dispatch(EventEnum.ExplosionBorn, bullet.id,
            {
              x: toFixed((actor.position.x + bullet.position.x) / 2),
              y: toFixed((actor.position.y + bullet.position.y) / 2)
            });
          bullets.splice(i, 1);
          //扣血
          //随机数暴击判断
          const seed = fakeRandom(this.state.seed);
          this.state.seed = seed;
          const damage = seed / 233280 > 0.5 ? bullet.damage * 2 : bullet.damage;
          actor.hp -= damage;
          console.log("击中目标->", (actor.position.x - bullet.position.x) / 2, (actor.position.y - bullet.position.y) / 2);
          continue;
        }
      }
      //todo:新增反弹点距离计算
      if (bullet.reboundPoints && bullet.reboundPoints.length > 0) {
        //计算总range
        let totalRange = 0;
        //先加起始点和第一个反弹的的距离
        totalRange += Vec2.distance(bullet.initPosition, bullet.reboundPoints[0]);
        for (let i = 0; i < bullet.reboundPoints.length; i++) {
          if (i === bullet.reboundPoints.length - 1) break;
          totalRange += Vec2.distance(bullet.reboundPoints[i], bullet.reboundPoints[i + 1]);
        }
        //最后算最后的反弹点到当前位置的距离
        totalRange += Vec2.distance(bullet.reboundPoints[bullet.reboundPoints.length - 1], bullet.position);
        if (totalRange > bullet.range) {
          EventManager.dispatch(EventEnum.ExplosionBorn, bullet.id, { x: bullet.position.x, y: bullet.position.y });
          bullets.splice(i, 1);
          break;
        }
      }

    }
    //遍历子弹改变位置
    //todo:新增碰墙反弹玩法，墙面暂时为视窗边界
    for (const bullet of bullets) {
      const oldX = bullet.position.x;
      const oldY = bullet.position.y;

      // 计算新位置
      const newX = oldX + toFixed(bullet.direction.x * dt * BULLETSPEED);
      const newY = oldY + toFixed(bullet.direction.y * dt * BULLETSPEED);
      //判断是否碰到边界
      if (bullet.position.x < -WINDOW_SIZE.width / 2 || bullet.position.x > WINDOW_SIZE.width / 2) {
        //记录碰撞点
        const boundaryX = newX < 0 ? -WINDOW_SIZE.width / 2 : WINDOW_SIZE.width / 2;
        //相似三角形比例
        const ratio = (boundaryX - oldX) / (newX - oldX);
        const boundaryY = oldY + ((newY - oldY) * ratio);

        //记录碰撞点坐标
        bullet.reboundPoints.push({ x: boundaryX, y: toFixed(boundaryY) });
        //翻转x方向
        bullet.direction.x *= -1;
        bullet.position.x = boundaryX;
        bullet.position.y = boundaryY;

      } else if (bullet.position.y < -WINDOW_SIZE.height / 2 || bullet.position.y > WINDOW_SIZE.height / 2) {
        const boundaryY = newY < 0 ? -WINDOW_SIZE.height / 2 : WINDOW_SIZE.height / 2;
        const ratio = (boundaryY - oldY) / (newY - oldY);
        const boundaryX = oldX + ((newX - oldX) * ratio);
        bullet.reboundPoints.push({ x: toFixed(boundaryX), y: boundaryY });
        bullet.direction.y *= -1;
        bullet.position.x = boundaryX;
        bullet.position.y = boundaryY;
      }else {
        bullet.position.x = newX;
        bullet.position.y = newY;
      }
    }
    // const actor: IActor = DataManager.Instance.actorMap.get(userId);
    // actor.position = add(actor.position, mul(direction, dt));
    // actor.direction = direction;
    // console.log("移动玩家->", actor);
    // console.log("bullets->", bullets);
  }
}
