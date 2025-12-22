import { _decorator, Component, Node } from 'cc';
import EventManager from '../Global/EventManager';
import { EventEnum } from '../Enum/Enum';
const { ccclass, property } = _decorator;

@ccclass('shootManager')
export class shootManager extends Component {

    /**
     * 发射按钮点击时
     */
    shootHandle(){
        EventManager.dispatch(EventEnum.WeaponShoot);
    }
}


