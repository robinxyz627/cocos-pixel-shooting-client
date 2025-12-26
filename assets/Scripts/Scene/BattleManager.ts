import { _decorator, Component, director, instantiate, macro, Node, Prefab, SpriteFrame, view } from 'cc';
import DataManager from '../Global/DataManager';
import { joyStickManager } from '../UI/joyStickManager';
import { ResourceManager } from '../Global/ResourceManager';
import { ActorManager } from '../Entity/Actor/ActorManager';
import { EventEnum, PrefabPathEnum, SceneEnum, TexturePathEnum } from '../Enum/Enum';

import { ApiMsgEnum, EntityTypeEnum, InputTypeEnum } from '../Common/Enum';
import { IClientInput, ITimePast } from '../Common/State';
import { IMsgClientSync, IMsgServerSync } from '../Common/Msg';

import { BulletManager } from '../Entity/Bullet/BulletManager';
import { ObjectPoolManager } from '../Global/ObjectPoolManager';
import { NetworkManager } from '../Global/NetworkManager';
import EventManager from '../Global/EventManager';
import { deepClone } from '../Utils/Utils';

const { ccclass, property } = _decorator;

@ccclass('BattleManager')
export class BattleManager extends Component {
    private stage: Node = null;
    private ui: Node = null;
    private isLoadFinish: boolean = false;
    private isRanderMap: boolean = false;
    private isPlayersCount: boolean = false;
    private isUserGG: boolean = false;

    /**
     * 本地同步缓存
     */
    private pendingMsg: IMsgClientSync[] = [];

    protected onLoad(): void {
        //设置横屏

    }
    private gameClear() {
        EventManager.Instance.off(EventEnum.ClintSync, this.clientSyncHandle, this);
        EventManager.Instance.off(EventEnum.PlayerGG, this.playerLossHandle, this);
        NetworkManager.Instance.unlistenMsg(ApiMsgEnum.MsgServerSync, this.serverSyncHandle, this);

        this.setLandscape();
        DataManager.Instance.stage = this.stage = this.node.getChildByName("Stage");
        this.ui = this.node.getChildByName("UI");

        //去除场景测试使用的子节点
        this.stage.destroyAllChildren();
        //关闭失败面板
        this.lossPannanlOnShow(false);
        DataManager.Instance.roomInfo = null;
        DataManager.Instance.actorMap.clear();
        DataManager.Instance.bulletMap.clear();

        this.pendingMsg = [];

        ObjectPoolManager.clear();
    }

    private gameInit() {
        DataManager.Instance.jsm = this.ui.getComponentInChildren(joyStickManager);
        this.isLoadFinish = true;
        //绑定事件回调
        EventManager.Instance.on(EventEnum.ClintSync, this.clientSyncHandle, this);
        EventManager.Instance.on(EventEnum.PlayerGG, this.playerLossHandle, this);
        NetworkManager.Instance.listenMsg(ApiMsgEnum.MsgServerSync, this.serverSyncHandle, this);
    }
    async start() {
        this.gameClear();
        await Promise.all([
            this.loadResources(),
            this.connectServer(),
        ]);
        //连接服务器获取id
        this.gameInit();

    }

    protected onDestroy(): void {
        EventManager.Instance.off(EventEnum.ClintSync, this.clientSyncHandle, this);
        EventManager.Instance.off(EventEnum.PlayerGG, this.playerLossHandle, this);
        NetworkManager.Instance.unlistenMsg(ApiMsgEnum.MsgServerSync, this.serverSyncHandle, this);
        this.pendingMsg = [];
        ObjectPoolManager.clear();
    }


    async connectServer() {
        //连接服务器
        if (!await NetworkManager.Instance.connect().catch(() => false)) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.connectServer();
        }
    }

    update(deltaTime: number) {
        if (!this.isLoadFinish) {
            console.log("资源未加载完成/网络异常");
            return;
        }
        if (this.isUserGG) {
            return;
        }
        this.rander(deltaTime);
        this.tick(deltaTime);
    }

    //设置为横屏
    setLandscape() {
        view.setOrientation(macro.ORIENTATION_AUTO);
    }


    async loadResources() {
        const list = [];
        for (const type in PrefabPathEnum) {
            const p = ResourceManager.Instance.loadRes(PrefabPathEnum[type], Prefab).then(prefab => {
                DataManager.Instance.prefabMap.set(type, prefab);
                console.log("load->" + type);
            });
            list.push(p);
        }
        for (const type in TexturePathEnum) {
            const p = ResourceManager.Instance.loadDir(TexturePathEnum[type], SpriteFrame).then(spframs => {
                DataManager.Instance.textureMap.set(type, spframs);
                console.log("load->" + type);
            });
            list.push(p);
        }
        await Promise.all(list);
    }

    tick(deltaTime: number) {
        this.tickActor(deltaTime);
        // this.tickTimePast(deltaTime);
        //时间输入改为服务端
    }

    tickActor(deltaTime: number) {
        for (const actorInfo of DataManager.Instance.state.actors) {
            const { userId } = actorInfo;
            const actorComp = DataManager.Instance.actorMap.get(userId);
            if (actorComp) {
                actorComp.tick(deltaTime);
            } else {
                console.error("没有这个玩家引用->", userId);
            }
        }
    }

    tickTimePast(deltaTime: number) {
        const tp: ITimePast = {
            type: InputTypeEnum.TimePast,
            dt: deltaTime,
        };
        DataManager.Instance.applyInput(tp);
    }
    //#region [rander]
    rander(deltaTime: number) {

        //渲染顺序决定覆盖关系
        this.randerMap();
        this.randerActor();
        this.randerBullet();
    }

    randerActor() {
        for (const actorInfo of DataManager.Instance.state.actors) {
            const { type, userId } = actorInfo;
            let actCp = DataManager.Instance.actorMap.get(userId);
            if (!actCp) {
                const pfb = DataManager.Instance.prefabMap.get(type);
                const act = instantiate(pfb);
                act.setParent(this.stage);
                actCp = act.addComponent(ActorManager);
                DataManager.Instance.actorMap.set(userId, actCp);
                actCp.init(actorInfo);
            } else {
                actCp.rander(actorInfo);
            }
        }
        if (this.isPlayersCount === false) {
            DataManager.Instance.roomPlayers = DataManager.Instance.actorMap.size;
            console.log("房间人数->", DataManager.Instance.roomPlayers);
            this.isPlayersCount = true;
        }

    }

    randerMap() {
        //暂不需要每帧渲染
        if (this.isRanderMap == false) {
            const pfb = DataManager.Instance.prefabMap.get(EntityTypeEnum.Map);
            const map = instantiate(pfb);
            map.setParent(this.stage);
            this.isRanderMap = true;
        }
    }

    randerBullet() {
        for (const bulletInfo of DataManager.Instance.state.bullets) {
            const { type, id } = bulletInfo;
            let bulletCp = DataManager.Instance.bulletMap.get(id);
            if (!bulletCp) {
                // const pfb = DataManager.Instance.prefabMap.get(type);
                // const bullet = instantiate(pfb);
                // bullet.setParent(this.stage);
                // bulletCp = bullet.addComponent(BulletManager);
                //使用对象池
                const bullet = ObjectPoolManager.get(type);
                bulletCp = bullet.getComponent(BulletManager) || bullet.addComponent(BulletManager);
                DataManager.Instance.bulletMap.set(id, bulletCp);
                bulletCp.init(bulletInfo);
            } else {
                bulletCp.rander(bulletInfo);
            }
        }
    }

    //#endregion

    //#region 事件回调handle
    /**
     * 客户端同步
     * @param input 
     * @赠加预测回滚
     */
    private clientSyncHandle(input: IClientInput) {
        const msg: IMsgClientSync = {
            input,
            frameId: DataManager.Instance.frameId++,
        }
        NetworkManager.Instance.sendMsg(ApiMsgEnum.MsgClientSync, msg);
        if (input.type === InputTypeEnum.ActorMove) {
            DataManager.Instance.applyInput(input);
            this.pendingMsg.push(msg);
        }
    }

    /**
     * 服务端同步
     * @param {IMsgServerSync} data 
     * @先回滚
     */
    private serverSyncHandle({ inputs, lastFrameId }: IMsgServerSync) {
        DataManager.Instance.state = DataManager.Instance.lastState;//从上一次同步开始输入
        console.log("serverSyncHandle:", inputs, lastFrameId);
        if (inputs.length === 0) return;
        for (const input of inputs) {
            DataManager.Instance.applyInput(input);
        }

        DataManager.Instance.lastState = deepClone(DataManager.Instance.state);//更新这次输入
        //从pendingMsg中移除已完成的输入，并继续执行未完成的输入，保着流畅，但在显示上网卡会有闪回的感觉，但也比原先逻辑的不能动好
        this.pendingMsg = this.pendingMsg.filter(msg => msg.frameId > lastFrameId);
        for (const msg of this.pendingMsg) {
            DataManager.Instance.applyInput(msg.input);
        }
    }
    //#endregion

    //#region 战斗结算处理
    lossPannanlOnShow(isShow: boolean) {
        this.node.getChildByPath("UI/loss").active = isShow;
    }

    async returnHallBtnOnClick() {
        const { success, res, error } = await NetworkManager.Instance.callApi(ApiMsgEnum.ApiRoomLeave, {});
        if (!success) {
            console.log(error);
            return;
        }
        ObjectPoolManager.clear();
        director.loadScene(SceneEnum.Hall);
        DataManager.Instance.roomInfo = null;
        DataManager.Instance.actorMap.clear();
        DataManager.Instance.bulletMap.clear();
    }

    async successHandle() {
        const { success, res, error } = await NetworkManager.Instance.callApi(ApiMsgEnum.ApiRoomLeave, {});
        if (!success) {
            console.log(error);
            return;
        }
        //禁止本机射击，避免子弹节点被销毁，动画还在播放
        DataManager.Instance.actorMap.get(DataManager.Instance.playerId).disableWeapon();
        //删除场上所有子弹
        ObjectPoolManager.clear();
        director.loadScene(SceneEnum.Hall);
        DataManager.Instance.roomInfo = null;
        DataManager.Instance.actorMap.clear();
        DataManager.Instance.bulletMap.clear();

    }

    /**
     * 某个玩家失败处理
     */
    async playerLossHandle(userId: number) {
        //判断是不是机主
        if (DataManager.Instance.playerId === userId) {
            this.isUserGG = true;
            this.lossPannanlOnShow(true);
            //关闭失败处理事件防止误判
            EventManager.Instance.off(EventEnum.PlayerGG, this.playerLossHandle, this);
        }
        //踢出渲染map和state,使其不再参与交互
        DataManager.Instance.state.actors = DataManager.Instance.state.actors.filter(actor => actor.userId !== userId);
        // DataManager.Instance.state.bullets = DataManager.Instance.state.bullets.filter(bullet => bullet.owner !== userId);
        const actCp = DataManager.Instance.actorMap.get(userId);
        // DataManager.Instance.actorMap.delete(userId);
        DataManager.Instance.roomPlayers--;

        //延迟0.5s失能角色
        this.scheduleOnce(() => {
            //可加消散特效
            actCp.node.active = false;

        }, 0.5);
        //判断当前玩家数，若<=1,则还剩下胜利者
        if (DataManager.Instance.roomPlayers <= 1 && DataManager.Instance.playerId !== userId) {
            //TODO:胜利逻辑
            this.scheduleOnce(() => {

                this.successHandle();
            }, 2);

        }
    }

    //#endregion
}

