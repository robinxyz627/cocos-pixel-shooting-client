import { _decorator, Component, instantiate, Node } from 'cc';
import { EntityTypeEnum, IBullet, IVector2 } from '../../Common';
import { EntityManager } from '../../Base/EntityManager';
import { ExplosionStateMachine } from './ExplosionStateMachine';
import { EntityStateEnum, EventEnum } from '../../Enum/Enum';
import EventManager from '../../Global/EventManager';
const { ccclass, property } = _decorator;

@ccclass('ExplosionManager')
export class ExplosionManager extends EntityManager {
    type: EntityTypeEnum = null;
    parentNode: Node = null;
    id:number = null;

    init(type: EntityTypeEnum, {x,y}: IVector2) {
        this.node.setPosition(x,y);
        this.type = type;

        this.fsm = this.addComponent(ExplosionStateMachine);
        this.fsm.init(type);
        this.state = EntityStateEnum.Idle;

    }

    protected onDestroy(): void {
        //移除监听

    }


}


