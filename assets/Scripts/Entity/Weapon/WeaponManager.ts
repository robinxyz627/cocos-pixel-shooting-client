import { _decorator, Component, instantiate, Node, UITransform, Vec2 } from 'cc';
import DataManager from '../../Global/DataManager';
import { InputTypeEnum} from '../../Common/Enum';
import { IActor,IWeaponShoot } from '../../Common/State';

import { EntityManager } from '../../Base/EntityManager';
import { WeaponStateMachine } from './WeaponStateMachine';
import { EntityStateEnum, EventEnum, PrefabPathEnum } from '../../Enum/Enum';
import EventManager from '../../Global/EventManager';
import { toFixed } from '../../Common/toFix';
const { ccclass, property } = _decorator;

@ccclass('WeaponManager')
export class WeaponManager extends EntityManager {
    private owner: number = -1;

    public body: Node = null;
    private anchor: Node = null;
    private aim: Node = null;
    init(data: IActor) {
        //设置武器所有者
        this.owner = data.userId;

        this.body = this.node.getChildByName("body");
        this.anchor = this.body.getChildByName("anchor");
        this.aim = this.anchor.getChildByName("aim");

        this.fsm = this.body.addComponent(WeaponStateMachine);
        this.fsm.init(data.weaponType);
        this.state = EntityStateEnum.Idle;

        //只注册本机用户的发射按钮点击事件
        if (this.owner === DataManager.Instance.playerId) {
            EventManager.addListener(EventEnum.WeaponShoot, this.handleWeaponShoot, this);
        }
        EventManager.addListener(EventEnum.BulletBorn, this.handleBulletBorn, this);

    }

    protected onDestroy(): void {
        if (this.owner === DataManager.Instance.playerId) {
            EventManager.Instance.off(EventEnum.WeaponShoot, this.handleWeaponShoot, this);
        }
        EventManager.Instance.off(EventEnum.BulletBorn, this.handleBulletBorn, this);
    }

    disenableShoot() {
        EventManager.Instance.off(EventEnum.WeaponShoot, this.handleWeaponShoot, this);
    }

    handleBulletBorn(owner: number) {
        if (owner !== this.owner) {
            return;
        }
        this.state = EntityStateEnum.Attack;
    }

    handleWeaponShoot() {
        const shootPointWorldPos = this.aim.getWorldPosition();
        //转换成在stage上的坐标
        const shootPointLocalPos = DataManager.Instance.stage.getComponent(UITransform).convertToNodeSpaceAR(shootPointWorldPos);
        const anchorWorldPos = this.anchor.getWorldPosition();
        const direction = new Vec2(shootPointWorldPos.x - anchorWorldPos.x, shootPointWorldPos.y - anchorWorldPos.y).normalize();

        const ws: IWeaponShoot = {
            type: InputTypeEnum.WeaponShoot,
            owner: this.owner,
            position: {
                x: toFixed(shootPointLocalPos.x),
                y: toFixed(shootPointLocalPos.y),
            },
            direction: {
                x: toFixed(direction.x),
                y: toFixed(direction.y),
            },
        }
        EventManager.Instance.emit(EventEnum.ClintSync, ws);
        //变更为发送给服务端，由服务端同步
        // DataManager.Instance.applyInput(ws);

    }



}


