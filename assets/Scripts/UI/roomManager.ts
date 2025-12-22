import { _decorator, Component, LabelComponent, Node, SpriteComponent, SpriteFrame } from 'cc';
import { IRoom } from '../Common/Api';
import EventManager from '../Global/EventManager';
import { EventEnum } from '../Enum/Enum';
const { ccclass, property } = _decorator;

@ccclass('roomManager')
export class roomManager extends Component {
    private _nameComp: LabelComponent = null;
    private _roomSculptureComp: SpriteComponent = null;
    private _stateComp: LabelComponent = null;
    private _highlightNode: Node = null;

    private _isInit: boolean = false;
    public _roomInfo: IRoom = null;
    start() {

    }

    update(deltaTime: number) {

    }

    init() {
        this._nameComp = this.node.getChildByPath("layout/name").getComponent(LabelComponent);
        this._roomSculptureComp = this.node.getChildByPath("layout/roomSculpture").getComponent(SpriteComponent);
        this._stateComp = this.node.getChildByPath("layout/state").getComponent(LabelComponent);
        this._highlightNode = this.node.getChildByName("light");
        if (!this._nameComp || !this._roomSculptureComp || !this._stateComp || !this._highlightNode) {
            console.error("roomManager:onLoad:error");
        } else {
            this._isInit = true;
            console.log("roomManager:init:success");
        }
    }
    updateRoomSinglePannel(room: IRoom) {
        if (!this._isInit) {
            console.error("roomManager:updateRoomSinglePannel:error");
            return;
        }
        this._roomInfo = room;
        console.log("updateRoomSinglePannel:", room);
        this._nameComp.string = room.rid.toString();
        this._stateComp.string = `${room.players.length}/n`;
        this.node.active = true;
    }

    /**
     * 自己高亮不要忘记取消其他高亮
     * @在Room场景管理里关闭
     */
    onClickHandle(){
        //高亮
        this._highlightNode.active = true;
        EventManager.dispatch(EventEnum.RoomSelect,this._roomInfo);
    }

    cancelHighlight(){
        this._highlightNode.active = false;
    }
}


