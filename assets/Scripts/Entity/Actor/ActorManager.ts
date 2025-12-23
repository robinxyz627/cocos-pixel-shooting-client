import { _decorator, Component, instantiate, Node, ProgressBar, sp, tween, Tween, Vec3 } from 'cc';
import DataManager from '../../Global/DataManager';
import { EntityTypeEnum, InputTypeEnum } from '../../Common/Enum';
import { IActor } from '../../Common/State';
import { EntityManager } from '../../Base/EntityManager';
import { ActorStateMachine } from './ActorStateMachine';
import { EntityStateEnum, EventEnum, PrefabPathEnum } from '../../Enum/Enum';
import { WeaponManager } from '../Weapon/WeaponManager';
import { radToAngle, toLowerCase } from '../../Utils/Utils';
import EventManager from '../../Global/EventManager';
import { toFixed } from '../../Common/toFix';
const { ccclass, property } = _decorator;

@ccclass('ActorManager')
export class ActorManager extends EntityManager {
    private id: number = null;
    private wpm: WeaponManager = null;
    bulletType: EntityTypeEnum = null;
    weaponType: EntityTypeEnum = null;

    private _sk: sp.Skeleton = null;

    //血条progress
    private hp: ProgressBar = null;
    private feedDogCounter: number = 0;

    private targetPos: Vec3;
    private tw: Tween<Node> = null;
    start() {

    }

    // update(deltaTime: number) {
    //     // super.update(deltaTime);
    //     if (this.feedDogCounter > 0) {
    //         this.feedDogCounter -= deltaTime;
    //         this.state = EntityStateEnum.Run;
    //         console.log("ActorManager:update:run", this.id, this.feedDogCounter);
    //     } else {
    //         this.state = EntityStateEnum.Idle;
    //         console.log("ActorManager:update:idle", this.id);
    //     }
    // }
    init(data: IActor): void {
        this.bulletType = data.bulletType;
        this.id = data.userId;
        this.weaponType = data.weaponType;
        this.hp = this.node.getChildByName("HP").getComponent(ProgressBar);

        if (data.type === EntityTypeEnum.Skeleton) {
            this.initSkeleton(data);
        } else {
            this.initDefault(data);
        }
    }

    initDefault(data: IActor) {
        this.fsm = this.addComponent(ActorStateMachine);
        this.fsm.init(data.type);
        this.state = EntityStateEnum.Idle;

        //武器实例化并绑定武器组件
        const pfb = DataManager.Instance.prefabMap.get(this.weaponType);
        const weapon = instantiate(pfb);
        weapon.setParent(this.node);
        this.wpm = weapon.addComponent(WeaponManager);
        this.wpm.init(data);
    }

    initSkeleton(data: IActor) {
        //骨骼动画保存组件引用
        this._sk = this.node.getComponent(sp.Skeleton);

        //TODO获取贴图（贴图需要发给服务器，如此客户端才能互相看到，从map中通过id取出，此处简易实现）
        this._sk.setSlotTexture("actorModel", DataManager.Instance.userTexture);

        this.setState(data, EntityStateEnum.Idle);
        this._sk.invalidAnimationCache();
        this._sk.markForUpdateRenderData();

        //武器实例化并绑定武器组件
        const pfb = DataManager.Instance.prefabMap.get(this.weaponType);
        const weapon = instantiate(pfb);
        weapon.setParent(this.node);
        const scale = weapon.getScale();
        const parentScale = this.node.getScale();
        //保持武器大小不变，抵消父节点缩放
        weapon.setScale(new Vec3((1 / parentScale.x) * scale.x, (1 / parentScale.y) * scale.y, scale.z));
        this.wpm = weapon.addComponent(WeaponManager);
        this.wpm.init(data);
    }

    /**
     * 动画机状态切换(兼容骨骼动画)
     * 骨骼动画名称小写⭐
     * 
     * @param IActor
     */
    private _skLastState: any = null;
    setState(info: IActor, animState: EntityStateEnum) {
        const type = info.type;
        if (type === EntityTypeEnum.Skeleton) {
            if (animState === this._skLastState) {
                return;
            }
            this._skLastState = animState;
            this._sk.setAnimation(0, toLowerCase(animState), true);        
        } else {
            this.state = animState;
        }
    }

    /**
     * 操作输入【单帧】,该函数仅仅针对于本机玩家
     * 抛出客户端同步事件
     * @param deltaTime 
     */
    tick(deltaTime: number) {
        if (this.id !== DataManager.Instance.playerId) {
            return;
        }
        const info: IActor = {
            userId: -1,
            position: { x: 0, y: 0 },
            direction: { x: 0, y: 0 },
            type: this._sk ? EntityTypeEnum.Skeleton : EntityTypeEnum.Actor1,
            hp: -1,
        }
        if (DataManager.Instance.jsm.joyStickInput.length() > 0) {
            const { x, y } = DataManager.Instance.jsm.joyStickInput;
            EventManager.dispatch(EventEnum.ClintSync, {
                userId: this.id,
                type: InputTypeEnum.ActorMove,
                direction: { x: toFixed(x), y: toFixed(y) },
                dt: toFixed(deltaTime),
            });
            // DataManager.Instance.applyInput({
            //     userId: 0,
            //     type: InputTypeEnum.ActorMove,
            //     direction: { x, y },
            //     dt: deltaTime,
            // });
            // console.log(DataManager.Instance.state.actors[0]);

            this.setState(info, EntityStateEnum.Run);
        } else {
            this.setState(info, EntityStateEnum.Idle);
        }
    }

    feedDog() {
        this.feedDogCounter = 0.5; //持续0.5秒
    }
    /**
     * 角色逐帧渲染
     * IActor {
         userId: number,
         type: EntityTypeEnum,
         position: IVector2,
         direction: IVector2,
     * }
     */
    rander(data: IActor) {
        this.randerPos(data);
        this.randerDir(data);
        this.randerHp(data);
    }

    //帧同步100ms一次，避免卡顿，加入缓动
    randerPos(data: IActor) {
        const { position } = data;
        const newPos = new Vec3(position.x, position.y, 0);
        if (!this.targetPos) {
            this.node.setPosition(newPos);
            this.targetPos = new Vec3(newPos);
        } else if (!this.targetPos.equals(newPos)) {
            this.tw?.stop();
            this.node.setPosition(this.targetPos);
            this.targetPos.set(newPos);
            this.setState(data, EntityStateEnum.Run);
            this.tw = tween(this.node)
                .to(0.1, { position: newPos })
                .call(() => {
                    this.setState(data, EntityStateEnum.Idle);
                })
                .start();
        }
    }

    randerDir(data: IActor) {
        const { direction } = data;
        //方向改变朝向,仅做水平翻转
        //保证原先scale大小不变
        let scale = this.node.getScale();
        scale.x = Math.abs(scale.x);
        let hpScale = this.hp.node.getScale();
        hpScale.x = Math.abs(hpScale.x);

        if (direction.x !== 0) {
            this.node.setScale(direction.x > 0 ? scale.x : -scale.x, scale.y);
            this.hp.node.setScale(direction.x > 0 ? hpScale.x : -hpScale.x, hpScale.y);
        }

        //托水平翻转的福，枪口朝向用反三角函数的正弦即可
        const sinX = direction.y / Math.sqrt(direction.x ** 2 + direction.y ** 2);
        const rad = Math.asin(sinX);
        const angle = radToAngle(rad);
        this.wpm.body.setRotationFromEuler(0, 0, angle);//旋转欧拉角，z轴
    }

    randerHp(data: IActor) {
        //设置血量
        this.hp.progress = data.hp / this.hp.totalLength;
    }
}


