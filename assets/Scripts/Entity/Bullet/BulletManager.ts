import { _decorator, Component, instantiate, Node, tween, Tween, Vec3 } from 'cc';
import { EntityTypeEnum } from '../../Common/Enum';
import { IBullet, IVector2 } from '../../Common/State';

import { EntityManager } from '../../Base/EntityManager';
import { BulletStateMachine } from './BulletStateMachine';
import { EntityStateEnum, EventEnum } from '../../Enum/Enum';
import { radToAngle } from '../../Utils/Utils';
import EventManager from '../../Global/EventManager';
import DataManager from '../../Global/DataManager';
import { ExplosionManager } from '../Explosion/ExplosionManager';
import { ObjectPoolManager } from '../../Global/ObjectPoolManager';
const { ccclass, property } = _decorator;

@ccclass('BulletManager')
export class BulletManager extends EntityManager {
    type: EntityTypeEnum = null;
    parentNode: Node = null;
    id: number = null;

    private targetPos: Vec3 = null;
    private tw: Tween<Node> = null;

    init(data: IBullet) {
        this.type = data.type;
        this.id = data.id;

        this.fsm = this.addComponent(BulletStateMachine);
        this.fsm.init(data.type);
        this.state = EntityStateEnum.Idle;

        //从父节点移除,不是销毁，任然驻留在内存中
        this.parentNode = this.node.parent;
        this.targetPos = null;
        this.node.removeFromParent();

        //监听爆炸事件
        EventManager.Instance.on(EventEnum.ExplosionBorn, this.handleExplosionBorn, this);

    }

    protected onDestroy(): void {
        //移除监听
        EventManager.Instance.off(EventEnum.ExplosionBorn, this.handleExplosionBorn, this);
    }

    handleExplosionBorn(id: number, { x, y }: IVector2) {
        if (this.id != id) return;
        // //创建爆炸
        // const pfb = DataManager.Instance.prefabMap.get(EntityTypeEnum.Explosion);
        // const explosion = instantiate(pfb);
        // explosion.setParent(DataManager.Instance.stage);
        // const expComp = explosion.addComponent(ExplosionManager);
        // expComp.init(EntityTypeEnum.Explosion, {x,y});

        // //删除子弹
        // EventManager.Instance.off(EventEnum.ExplosionBorn, this.handleExplosionBorn, this);
        // DataManager.Instance.bulletMap.delete(id);
        // this.node.destroy();
        //创建爆炸（使用对象池）
        const explosion = ObjectPoolManager.get(EntityTypeEnum.Explosion);
        const expComp = explosion.getComponent(ExplosionManager) || explosion.addComponent(ExplosionManager);
        expComp.init(EntityTypeEnum.Explosion, { x, y });//想要好的复用，必须有init

        //删除子弹
        EventManager.Instance.off(EventEnum.ExplosionBorn, this.handleExplosionBorn, this);
        DataManager.Instance.bulletMap.delete(id);
        ObjectPoolManager.ret(this.node);
    }
    rander(data: IBullet) {
        //添加到父节点(显示)
        this.node.parent = this.parentNode;
        

        const { direction, position } = data;
        const { x, y } = position;
        // this.node.setPosition(x, y);
        this.randerTween(data);
        //显示
        this.node.active = true;

        //子弹旋转角度->用反三角函数的正弦
        const sinX = direction.y / Math.sqrt(direction.x ** 2 + direction.y ** 2);
        const rad = Math.asin(sinX);
        const angle = direction.x > 0 ? radToAngle(rad) : 180 - radToAngle(rad);
        // console.log("angle->" + angle);
        this.node.setRotationFromEuler(0, 0, angle);//旋转欧拉角，z轴
    }

    randerTween(data: IBullet) {
        const { position } = data;
        const newPos = new Vec3(position.x, position.y, 0);
        if (!this.targetPos) {
            this.node.setPosition(newPos);
            this.targetPos = new Vec3(newPos);
        } else if (!this.targetPos.equals(newPos)) {
            this.tw?.stop();
            this.node.setPosition(this.targetPos);
            this.targetPos.set(newPos);
            this.tw = tween(this.node)
                .to(0.1, { position: newPos })
                .start();
        }
    }
}


