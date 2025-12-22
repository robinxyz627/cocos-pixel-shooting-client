import { _decorator, Component, instantiate, Node, ProgressBar, tween, Tween, Vec3 } from 'cc';
import DataManager from '../../Global/DataManager';
import { EntityTypeEnum, InputTypeEnum } from '../../Common/Enum';
import { IActor } from '../../Common/State';
import { EntityManager } from '../../Base/EntityManager';
import { ActorStateMachine } from './ActorStateMachine';
import { EntityStateEnum, EventEnum, PrefabPathEnum } from '../../Enum/Enum';
import { WeaponManager } from '../Weapon/WeaponManager';
import { radToAngle } from '../../Utils/Utils';
import EventManager from '../../Global/EventManager';
import { toFixed } from '../../Common/toFix';
const { ccclass, property } = _decorator;

@ccclass('ActorManager')
export class ActorManager extends EntityManager {
    private id: number = null;
    private wpm: WeaponManager = null;
    bulletType: EntityTypeEnum = null;

    //血条progress
    private hp: ProgressBar = null;
    private feedDogCounter: number = 0;

    private targetPos:Vec3;
    private tw:Tween<Node> = null;
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

    init(data: IActor) {
        this.bulletType = data.bulletType;
        this.id = data.userId;
        this.hp = this.node.getChildByName("HP").getComponent(ProgressBar);

        this.fsm = this.addComponent(ActorStateMachine);
        this.fsm.init(data.type);
        this.state = EntityStateEnum.Idle;

        //武器实例化并绑定武器组件
        const pfb = DataManager.Instance.prefabMap.get(EntityTypeEnum.Weapon1);
        const weapon = instantiate(pfb);
        weapon.setParent(this.node);
        this.wpm = weapon.addComponent(WeaponManager);
        this.wpm.init(data);
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

            this.state = EntityStateEnum.Run;
        } else {
            this.state = EntityStateEnum.Idle;
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
        if (!this.targetPos){
            this.node.setPosition(newPos);
            this.targetPos = new Vec3(newPos);
        }else if(!this.targetPos.equals(newPos)){
            this.tw?.stop();
            this.node.setPosition(this.targetPos);
            this.targetPos.set(newPos);
            this.state = EntityStateEnum.Run;
            this.tw = tween(this.node)
            .to(0.1, { position: newPos })
            .call(() => {
                this.state = EntityStateEnum.Idle;
            })
            .start();
        }
    }

    randerDir(data: IActor) {
        const { direction } = data;
        //方向改变朝向,仅做水平翻转
        if (direction.x !== 0) {
            this.node.setScale(direction.x > 0 ? 1 : -1, 1);
            this.hp.node.setScale(direction.x > 0 ? 1 : -1, 1);
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


