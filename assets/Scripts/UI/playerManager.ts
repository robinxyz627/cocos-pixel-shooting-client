import { _decorator, Component, LabelComponent, Node, SpriteComponent, SpriteFrame } from 'cc';
import { IApiPlayerListRes, IPlayer, IPlayerListInfo } from '../Common/Api';
const { ccclass, property } = _decorator;

@ccclass('playerManager')
export class playerManager extends Component {
    private _nameComp: LabelComponent = null;
    private _headSculptureComp: SpriteComponent = null;
    private _stateComp: LabelComponent = null;

    private _isInit: boolean = false;
    protected onLoad(): void {

    }
    start() {

    }

    update(deltaTime: number) {

    }

    init() {
        this._nameComp = this.node.getChildByName("name").getComponent(LabelComponent);
        this._headSculptureComp = this.node.getChildByName("headSculpture").getComponent(SpriteComponent);
        this._stateComp = this.node.getChildByName("state").getComponent(LabelComponent);
        if (!this._nameComp || !this._headSculptureComp || !this._stateComp) {
            console.error("playerManager:onLoad:error");
        } else {
            this._isInit = true;
            console.log("playerManager:init:success");
        }
    }
    updatePlayerSinglePannel(player: IPlayerListInfo) {
        if (!this._isInit) {
            console.error("playerManager:updateName:error");
            return;
        }
        console.log("updatePlayerSinglePannel:", player);
        this._nameComp.string = player.nickName;
        this._stateComp.string = "在线";
        this.node.active = true;
    }
}


