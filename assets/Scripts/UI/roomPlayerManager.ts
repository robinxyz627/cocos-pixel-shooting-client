import { _decorator, Component, LabelComponent, Node, SpriteComponent } from 'cc';
import { IPlayer } from '../Common/Api';
import DataManager from '../Global/DataManager';
const { ccclass, property } = _decorator;

@ccclass('roomPlayerManager')
export class roomPlayerManager extends Component {
    private _nameComp: LabelComponent = null;
    private _headSculptureComp: SpriteComponent = null;
    private _masterCrown: Node = null;
    private _selfFlag: Node = null;

    private _isInit: boolean = false;
    private _isMaster: boolean = false;
    protected onLoad(): void {

    }
    start() {

    }

    update(deltaTime: number) {

    }

    init() {
        this._nameComp = this.node.getChildByName("id").getComponent(LabelComponent);
        this._headSculptureComp = this.node.getComponent(SpriteComponent);
        this._masterCrown = this.node.getChildByName("crown");
        this._selfFlag = this.node.getChildByName("user");
        if (!this._nameComp || !this._headSculptureComp || !this._masterCrown || !this._selfFlag) {
            console.error("roomPlayerManager:onLoad:error");
            return;
        } else {
            this._isInit = true;
            console.log("roomPlayerManager:init:success");
        }
    }
    updatePlayerSinglePannel(player: IPlayer) {
        if (!this._isInit) {
            console.error("roomPlayerManager:updateName:error");
            return;
        }
        console.log("updatePlayerSinglePannel:", player);
        this._nameComp.string = player.nickName;
        //todo 增加判断是否是房主的方法
        if (this._isMaster) {
            this._masterCrown.active = true;
        } else {
            this._masterCrown.active = false;
        }
        //todo 增加判断是否是自己
        if (player.id === DataManager.Instance.playerId) {
            this._selfFlag.active = true;
        }else {
            this._selfFlag.active = false;
        }
        this.node.active = true;
    }

    setAsMaster(isMaster: boolean) {
        this._isMaster = isMaster;
    }
}


