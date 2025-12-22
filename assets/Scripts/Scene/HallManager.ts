import { _decorator, Component, director, EditBox, instantiate, Node, Prefab } from 'cc';
import { NetworkManager, ICallApiRet } from '../Global/NetworkManager';
import { IModel } from '../Common/Model';
import { IApiPlayerListRes, IApiRoomListRes, IRoom } from '../Common/Api';
import { ApiMsgEnum } from '../Common/Enum';

import DataManager from '../Global/DataManager';
import { EventEnum, SceneEnum } from '../Enum/Enum';
import { playerManager } from '../UI/playerManager';
import { IMsgPlayerList, IMsgRoomList } from '../Common/Msg';
import { roomManager } from '../UI/roomManager';
import EventManager from '../Global/EventManager';
const { ccclass, property } = _decorator;

@ccclass('HallManager')
export class HallManager extends Component {
    @property(Node)
    playerContent: Node = null;
    @property(Node)
    roomContent: Node = null;

    @property(Prefab)
    playerPrefab: Prefab = null;
    @property(Prefab)
    roomPrefab: Prefab = null;

    private _roomInfo: IRoom = null;
    protected onLoad(): void {
        NetworkManager.Instance.listenMsg(ApiMsgEnum.MsgPlayerList,this.msgPlayerListHandle,this);
        NetworkManager.Instance.listenMsg(ApiMsgEnum.MsgRoomList,this.msgRoomListHandle,this);
        

        EventManager.addListener(EventEnum.RoomSelect, this.roomSelectHandle, this);
    }
    start() {
        
        this.playerContent.destroyAllChildren();
        this.roomContent.destroyAllChildren();
        this.getPlayers();
        this.getRooms();
    }

    update(deltaTime: number) {

    }

    protected onDestroy(): void {
        NetworkManager.Instance.unlistenMsg(ApiMsgEnum.MsgPlayerList,this.msgPlayerListHandle,this);
        NetworkManager.Instance.unlistenMsg(ApiMsgEnum.MsgRoomList,this.msgRoomListHandle,this);

        EventManager.Instance.off(EventEnum.RoomSelect, this.roomSelectHandle, this);
    }
    async getPlayers() {
        const data = await NetworkManager.Instance.callApi(ApiMsgEnum.ApiPlayerList, {});
        const { success, res, error } = data;
        if (!success) {
            console.log(error);
            return;
        }
        this.randerPlayer(res);
    }

    async getRooms() {
        const data = await NetworkManager.Instance.callApi(ApiMsgEnum.ApiRoomList, {});
        const { success, res, error } = data;
        if (!success) {
            console.log(error);
            return;
        }
        this.randerRoom(res);
    }

    randerPlayer(data: IApiPlayerListRes) {
        // console.log(data);
        for (const player of this.playerContent.children) {
            player.active = false;
        }
        //不够就加
        while (this.playerContent.children.length < data.players.length) {
            const playerNode = instantiate(this.playerPrefab);
            playerNode.active = false;
            playerNode.setParent(this.playerContent);
            let playerComp = playerNode.getComponent(playerManager);
            if (!playerComp) {
                console.log('预制体无组件！自动添加组件');
                playerNode.addComponent(playerManager);
            }
            playerComp.init();
        }

        for (let i = 0; i < data.players.length; i++) {
            const Lplayer = data.players[i];
            const pNode = this.playerContent.children[i];
            pNode.active = true;
            const pComp = pNode.getComponent(playerManager);
            pComp.updatePlayerSinglePannel(Lplayer);
        }
    }

        randerRoom(data: IApiRoomListRes) {
        // console.log(data);
        for (const room of this.roomContent.children) {
            room.active = false;
        }
        //不够就加
        while (this.roomContent.children.length < data.list.length) {
            const roomNode = instantiate(this.roomPrefab);
            roomNode.active = false;
            roomNode.setParent(this.roomContent);
            let roomComp = roomNode.getComponent(roomManager);
            if (!roomComp) {
                console.log('预制体无组件！自动添加组件');
                roomNode.addComponent(roomManager);
            }
            roomComp.init();
        }

        for (let i = 0; i < data.list.length; i++) {
            const Iroom = data.list[i];
            const rNode = this.roomContent.children[i];
            rNode.active = true;
            const rComp = rNode.getComponent(roomManager);
            rComp.updateRoomSinglePannel(Iroom);
        }
    }

    /*
    * 根据服务端发送的msg同步玩家列表
    * @转对象格式给randerPlayer渲染
    */
    msgPlayerListHandle(data: IMsgPlayerList) { 
        const playList = data.list;
        this.randerPlayer({players:playList});
    }

    async apiCreateRoomHandle() { 
        const {success,res,error} = await NetworkManager.Instance.callApi(ApiMsgEnum.ApiRoomCreate,{});
        if(!success){
            console.log(error);
            return;
        }
        DataManager.Instance.roomInfo = res.room;
        console.log(res.room.players);
        director.loadScene(SceneEnum.Room);
    }

    /**
     * 根据服务端发送的msg同步房间列表
     * @转对象格式给randerRoom渲染
     */
    msgRoomListHandle(data: IMsgRoomList) { 
        const roomList = data.list;
        this.randerRoom({list:roomList});
    }

    /**
     * 选择房间事件处理
     * @存下选择的房间信息，取消其他房间高亮
     * @在加入房间时需要检查引用不为null
     */
    roomSelectHandle(room: IRoom) {
        this._roomInfo = room;
        for (const roomNode of this.roomContent.children) {
            const roomComp = roomNode.getComponent(roomManager);
            if (roomComp._roomInfo !== room) {
                roomComp.cancelHighlight();
            }
        }
    }

    /**
     * @description 当点击加入房间按钮时
     */
    async apiRoomJoinHandle() {
        if (!this._roomInfo) {
            console.error("HallManager:apiRoomJoinHandle:error:no room selected");
            return;
        }
        const {success,res,error} = await NetworkManager.Instance.callApi(ApiMsgEnum.ApiRoomJoin,{rid:this._roomInfo.rid});
        if(!success){
            console.log(error);
            return;
        }
        DataManager.Instance.roomInfo = res.room;
        console.log(res.room.players);
        director.loadScene(SceneEnum.Room);
    }
}



