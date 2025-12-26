import { _decorator, Component, instantiate, Node } from 'cc';
import Singleton from '../Base/Singleton';
import { EntityTypeEnum} from '../Common/Enum';
import DataManager from './DataManager';

export class ObjectPoolManager extends Singleton {
    static get Instance() {
        return super.GetInstance<ObjectPoolManager>();
    }

    private objectPoolNode: Node = null;
    private objectPool: Map<EntityTypeEnum, Array<Node>> = new Map();

    //实现get和ret方法
    public static get(type: EntityTypeEnum) {
        let oNode = ObjectPoolManager.Instance.objectPoolNode;
        let oMap = ObjectPoolManager.Instance.objectPool;
        if (oNode === null) {
            ObjectPoolManager.Instance.objectPoolNode = new Node('objectPool');
            ObjectPoolManager.Instance.objectPoolNode.setParent(DataManager.Instance.stage);
            oNode = ObjectPoolManager.Instance.objectPoolNode;
        }
        if (!oMap.has(type)) {
            oMap.set(type, []);
            const container = new Node(type + "Pool");
            container.setParent(oNode);
        }
        const nodeArray = oMap.get(type);
        if (nodeArray.length === 0) {
            const pfb = DataManager.Instance.prefabMap.get(type);
            const node = instantiate(pfb);
            node.name = type;
            node.setParent(oNode.getChildByName(type + "Pool"));
            node.active = true;
            return node;
        } else {
            const node = nodeArray.pop();
            node.active = true;
            return node;
        }
    }

    public static ret(node: Node){
        node.active = false;
        ObjectPoolManager.Instance.objectPool.get(node.name as EntityTypeEnum).push(node);
    }

    public static clear() {
        ObjectPoolManager.Instance.objectPool.forEach((value, key) => {
            value.forEach(node => {
                if (node.isValid) {
                    node.destroy();
                }
            });
        });
        ObjectPoolManager.Instance.objectPoolNode = null;//下次使用对象池重新创建节点
        ObjectPoolManager.Instance.objectPool.clear();
    }
}


