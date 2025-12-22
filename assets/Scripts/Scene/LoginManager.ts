import { _decorator, Component, Director, director, EditBox, instantiate, Node, Prefab, sp } from 'cc';
import { NetworkManager, ICallApiRet } from '../Global/NetworkManager';
import { ApiMsgEnum } from '../Common/Enum';
import DataManager from '../Global/DataManager';
import { PrefabPathEnum, SceneEnum } from '../Enum/Enum';
import { ResourceManager } from '../Global/ResourceManager';
const { ccclass, property } = _decorator;

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
    protected onLoad(): void {
        if (!LoginManager._instance) {
            LoginManager._instance = this;
        }
        this.inputBox = this.getComponentInChildren(EditBox);
        director.preloadScene(SceneEnum.Battle);
    }
    async start() {
        this.loadPrefabView();
        // await NetworkManager.Instance.connect();
    }

    update(deltaTime: number) {

    }

    async handleClick(ev) {
        if (!NetworkManager.Instance.isConnect) {
            await NetworkManager.Instance.connect();
        }
        const nickName = this.inputBox.string;
        if (nickName === "") {
            this.inputBox.string = "请输入昵称";
            return;
        }
        const data = await NetworkManager.Instance.callApi(ApiMsgEnum.ApiPlayerJoin, { nickName });
        const { success, res, error } = data;
        if (!success) {
            console.log(error);
            return;
        }
        console.log(res);
        DataManager.Instance.playerId = res.player.id;
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
        this._index = this._prefabsNameArray.push(name) - 1;
        this.loadPrefabView();
    }
}


