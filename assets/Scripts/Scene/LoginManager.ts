import { _decorator, Component, Director, director, EditBox, instantiate, Node, Prefab, sp } from 'cc';
import { NetworkManager, ICallApiRet } from '../Global/NetworkManager';
import { ApiMsgEnum, EntityTypeEnum } from '../Common/Enum';
import DataManager from '../Global/DataManager';
import { PrefabPathEnum, SceneEnum } from '../Enum/Enum';
import { ResourceManager } from '../Global/ResourceManager';
import { IPlayAttachment } from '../Common/Api';
const { ccclass, property } = _decorator;

function enumToArray<T>(enumObj: T): T[keyof T][] {
    return Object.keys(enumObj)
        .filter(key => isNaN(Number(key))) // 过滤数字键
        .map(key => enumObj[key as keyof T]);
}

@ccclass('LoginManager')
export class LoginManager extends Component {
    private static _instance: LoginManager = null;
    public static get instance() {
        // if (!this._instance) {
        //     this._instance = new LoginManager();
        // }
        return LoginManager._instance;
    }
    inputBox: EditBox = null;

    private _index: number = 0;
    private _prefabsNameArray: string[] = [
        PrefabPathEnum.Actor1,
        PrefabPathEnum.Actor2,
    ];
    private _prefabsEntityArray: string[] = [
        EntityTypeEnum.Actor1,
        EntityTypeEnum.Actor2,
    ];

    private static readonly entityTypeArray: EntityTypeEnum[] = enumToArray(EntityTypeEnum);
    //根据字符串获取索引
    getEntityIndexByName(name: string): number {
        const index = LoginManager.entityTypeArray.indexOf(name as EntityTypeEnum);
        if (index < 0) {
            console.error("你选的实体类型不存在啊!");
            return 0;
        }
        return index;
    }

    protected onLoad(): void {
        if (!LoginManager._instance) {
            LoginManager._instance = this;
        }
        this.inputBox = this.getComponentInChildren(EditBox);
        director.preloadScene(SceneEnum.Battle);
    }
    private _intervalId: number = null;
    async start() {
        this.loadPrefabView();
        NetworkManager.Instance.connectMissionStart(3000);
        this._intervalId = setInterval(() => {
            this.showConnectIcon();
        }, 2000);
    }

    update(deltaTime: number) {

    }

    protected onDestroy(): void {
        // NetworkManager.Instance.connectMissionStop();
        clearInterval(this._intervalId);
    }

    private showConnectIcon() {
        if (!NetworkManager.Instance.isConnect) {
            this.node.getChildByName("wifiDisconn").active = true;
        }else {
            this.node.getChildByName("wifiDisconn").active = false;
        }
    }
    async handleClick(ev) {
        if (!NetworkManager.Instance.isConnect) {
            console.error("请先连接服务器");
            return;
        }
        const nickName = this.inputBox.string;
        if (nickName === "") {
            this.inputBox.string = "请输入昵称";
            return;
        }
        const attachment = this.generatePlayerAttachment();
        const data = await NetworkManager.Instance.callApi(ApiMsgEnum.ApiPlayerJoin, { nickName, attachment });
        const { success, res, error } = data;
        if (!success) {
            console.log(error);
            return;
        }
        console.log(res);
        DataManager.Instance.playerId = res.id;
        // DataManager.Instance.state.actors[0].userId = res.player.id;
        director.loadScene(SceneEnum.Hall);

    }

    userDrawSkinBtnOnClick() {
        this.node.getChildByName("drawPannel").active = true;
    }

    userSwitchLeftBtnOnClick() {
        this._index--;
        if (this._index < 0) {
            this._index = this._prefabsNameArray.length - 1;
        }
        this.loadPrefabView();
    }

    userSwitchRightBtnOnClick() {
        this._index++;
        if (this._index >= this._prefabsNameArray.length) {
            this._index = 0;
        }
        this.loadPrefabView();
    }

    async loadPrefabView() {
        if (this._index >= this._prefabsNameArray.length) {
            this._index = 0;
        }
        const prefabPathName = this._prefabsNameArray[this._index];
        const viewNode = this.node.getChildByName("grid");
        //销毁角色节点
        viewNode.getChildByName("actor")?.destroy();
        await new Promise(resolve => {
            director.once(Director.EVENT_AFTER_DRAW, resolve);
        });
        const p = ResourceManager.Instance.loadRes(prefabPathName, Prefab).then(pfb => {
            const actorNode = instantiate(pfb);
            actorNode.setParent(viewNode);
            actorNode.name = "actor";
            if (prefabPathName.indexOf("user") >= 0) {
                //todo 替换spine动画贴图
                const skeleton = actorNode.getComponent(sp.Skeleton);
                skeleton.setSlotTexture("actorModel", DataManager.Instance.userTexture);
                skeleton.invalidAnimationCache();
                skeleton.markForUpdateRenderData();
            }
        });
    }

    addToView(name: string) {
        //判断是不是已经有了
        const index = this._prefabsNameArray.indexOf(name);
        if (index >= 0) {
            //找到索引
            this._index = index;
            this.loadPrefabView();
            return;
        }
        this._index = this._prefabsNameArray.push(name) - 1;
        this._prefabsEntityArray.push(EntityTypeEnum.Skeleton);
        this.loadPrefabView();
    }

    /**
     * @description 更新本机角色
     * @returns {IPlayAttachment}
     */
    generatePlayerAttachment(): IPlayAttachment {
        return {
            actorId: this.getEntityIndexByName(this._prefabsEntityArray[this._index]),
            weaponId: 4,//weapon2
        }
    }
}


