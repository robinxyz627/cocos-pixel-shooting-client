import { _decorator, Component, director, instantiate, LabelComponent, Node, Prefab } from 'cc';
import { NetworkManager } from '../Global/NetworkManager';
import { ApiMsgEnum } from '../Common/Enum';
import { IMsgGameStart, IMsgRoom } from '../Common/Msg';
import { roomPlayerManager } from '../UI/roomPlayerManager';
import DataManager from '../Global/DataManager';
import EventManager from '../Global/EventManager';
import { EventEnum, SceneEnum } from '../Enum/Enum';
import { IRoom } from '../Common/Api';
import { IState } from '../Common/State';
import { deepClone } from '../Utils/Utils';
const { ccclass, property } = _decorator;
/**
 * 房间内场景管理
*/
@ccclass('RoomManager')
export class RoomManager extends Component {
    @property(Node)
    playerContent: Node = null;
    @property(Prefab)
    playerPrefab: Prefab = null;
    @property(LabelComponent)
    roomId: LabelComponent = null;

    private _masterStartBtn: Node = null;

    protected onLoad(): void {
        this._masterStartBtn = this.node.getChildByName("Btn_Battle");
        NetworkManager.Instance.listenMsg(ApiMsgEnum.MsgRoom, this.randerPlayer, this);
        NetworkManager.Instance.listenMsg(ApiMsgEnum.MsgGameStart, this.msgGameStartHandle, this);
    }
    start() {
        this.playerContent.destroyAllChildren();
        //延时渲染，等待节点删完
        setTimeout(() => {
            this.randerPlayer({
                room: DataManager.Instance.roomInfo,
            });
        }, 200);
        this.roomId.string = `房间号:${DataManager.Instance.roomInfo.rid.toString()}`;
    }

    update(deltaTime: number) {

    }

    protected onDestroy(): void {
        NetworkManager.Instance.unlistenMsg(ApiMsgEnum.MsgRoom, this.randerPlayer, this);
        NetworkManager.Instance.unlistenMsg(ApiMsgEnum.MsgGameStart, this.msgGameStartHandle, this);
    }

    randerPlayer(data: IMsgRoom) {
        console.log("RoomManager:randerPlayer:", data);
        const players = data.room.players;
        const master = data.room.master;
        for (const player of this.playerContent.children) {
            player.active = false;
        }
        //不够就加
        while (this.playerContent.children.length < players.length) {
            const playerNode = instantiate(this.playerPrefab);
            playerNode.active = false;
            playerNode.setParent(this.playerContent);
            let playerComp = playerNode.getComponent(roomPlayerManager);
            if (!playerComp) {
                console.log('预制体无组件！自动添加组件');
                playerNode.addComponent(roomPlayerManager);
            }
            playerComp.init();
        }

        for (let i = 0; i < players.length; i++) {
            const Lplayer = players[i];
            const pNode = this.playerContent.children[i];
            pNode.active = true;
            const pComp = pNode.getComponent(roomPlayerManager);
            if (Lplayer.id === master) {
                pComp.setAsMaster(true);
            } else {
                pComp.setAsMaster(false);
            }
            pComp.updatePlayerSinglePannel(Lplayer);
        }
        //房主显示开始按钮
        if (master === DataManager.Instance.playerId) {
            this._masterStartBtn.active = true;
        } else {
            this._masterStartBtn.active = false;
        }
    }

    /**
     * 离开房间
     */
    async apiLeaveRoomHandle() {
        const { success, res, error } = await NetworkManager.Instance.callApi(ApiMsgEnum.ApiRoomLeave, {});
        if (!success) {
            console.log(error);
            return;
        }
        DataManager.Instance.roomInfo = null;
        director.loadScene(SceneEnum.Hall);
    }

    /**
     * 开始游戏请求
     */
    async apiGameStartHandle() {
        const { success, res, error } = await NetworkManager.Instance.callApi(ApiMsgEnum.ApiGameStart, {});
        if (!success) {
            console.log(error);
            return;
        }
    }

    /**
     * 开始游戏msg处理
     */
    msgGameStartHandle({state}:IMsgGameStart) {
        DataManager.Instance.state = state; 
        DataManager.Instance.lastState = deepClone(state);
        console.log("RoomManager:msgGameStartHandle:",DataManager.Instance.state);
        director.loadScene(SceneEnum.Battle);
    }

}


