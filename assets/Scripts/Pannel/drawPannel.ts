import {
    _decorator, Component, GraphicsComponent, Node, EventTouch,
    Vec2, UITransform, Vec3, Color, Texture2D, Graphics, RenderTexture,
    sp, Camera, director, Director, SpriteComponent, Asset, SpriteFrame, Rect, Size,
    Material,
    ImageAsset,
    Sprite
} from 'cc';
import { rgbView } from './rgbView';
import DataManager from '../Global/DataManager';
import { LoginManager } from '../Scene/LoginManager';
const { ccclass, property } = _decorator;

const GRAPH_SIZE = {
    width: 657,
    height: 682
};

@ccclass('drawPannel')
export class drawPannel extends Component {
    @property(GraphicsComponent)
    graphics: GraphicsComponent = null;
    @property(sp.Skeleton)
    skeleton: sp.Skeleton = null;

    private isDrawing: boolean = false;
    private lastPoint: Vec2 = new Vec2(0, 0);

    private _texture: Texture2D = null;
    private _randerData: Uint8Array<ArrayBuffer> = null;
    private _finishTexture: Texture2D = null;

    // private pointColor: Color = null;//画笔颜色(引用)
    protected onLoad(): void {
        if (!this.graphics || !this.skeleton) {
            console.error("[drawPannel]请检查节点配置");
        }
    }

    start() {
        // 添加触摸/鼠标事件监听
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        this.graphics.color = new Color(255, 255, 255);
    }

    onDestroy() {
        // 移除事件监听
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(event: EventTouch) {
        this.isDrawing = true;
        const location: Vec3 = new Vec3(event.getUILocation().x, event.getUILocation().y, 0);
        const localPoint = this.node.getComponent(UITransform).convertToNodeSpaceAR(location);

        this.graphics.strokeColor = rgbView.instance.vColor;
        // console.log(this.graphics.color);
        console.log(rgbView.instance.vColor);

        this.lastPoint.set(localPoint.x, localPoint.y);

        // 开始绘制路径
        this.graphics.moveTo(localPoint.x, localPoint.y);
    }

    onTouchMove(event: EventTouch) {
        if (!this.isDrawing) return;

        const location: Vec3 = new Vec3(event.getUILocation().x, event.getUILocation().y, 0);
        const localPoint = this.node.getComponent(UITransform).convertToNodeSpaceAR(location);

        // 绘制线条到新位置
        this.graphics.lineTo(localPoint.x, localPoint.y);
        this.graphics.stroke();

        // 更新最后位置
        this.lastPoint.set(localPoint.x, localPoint.y);

        // 移动到当前位置，为下一次绘制做准备
        this.graphics.moveTo(localPoint.x, localPoint.y);
    }

    onTouchEnd(event: EventTouch) {
        this.isDrawing = false;
    }

    // 清除画布的方法
    clear() {
        this.graphics.clear();
    }

    viewBtnOnClick() {
        this.exportAsTexture2D().then(tx => {
            if (!tx) {
                console.error("你妹画啊?!");
                return;
            }
            this._texture = tx;
            this.showGeneratedTexture(this._texture);
            this.replaceSkeletonModel(this.skeleton, this._texture);
        });
    }

    finishBtnOnClick() {
        if(this._texture == null&&this._finishTexture==null){
            console.error("你妹画啊?!");
            return;
        }
        DataManager.Instance.userTexture = this._finishTexture;
        LoginManager.instance.addToView("prefab/userSkeleton");
        this.node.active = false;
    }

    showGeneratedTexture(texture: Texture2D) {
        const previewSprite = this.node.getChildByName("preview")?.getComponent(SpriteComponent);
        if (previewSprite) {
            const spriteFrame = new SpriteFrame();
            spriteFrame.texture = texture;
            spriteFrame.rect = new Rect(0, 0, texture.width, texture.height);
            spriteFrame.originalSize = new Size(texture.width, texture.height);
            // spriteFrame.flipUVX = true;
            previewSprite.spriteFrame = spriteFrame;
        }
    }

    /**
    * 导出为texture2D
    */
    async exportAsTexture2D(): Promise<Texture2D | null> {

        const texture = new Texture2D();
        // 获取Graphics组件
        const graphics = this.graphics.node.getComponent(Graphics);
        // 创建RenderTexture，大小和Graphics一致
        const renderTexture = new RenderTexture();
        renderTexture.reset({
            width: GRAPH_SIZE.width,
            height: GRAPH_SIZE.height,
        });
        // 创建临时相机（专门用于渲染Graphics，不影响场景其他内容）
        const tempCameraNode = new Node("TempRenderCamera");
        const tempCamera = tempCameraNode.addComponent(Camera);
        tempCameraNode.setParent(this.node);
        // 设置相机参数：只渲染Graphics节点，正交相机（2D场景适配）
        tempCamera.priority = 1;
        tempCamera.projection = Camera.ProjectionType.ORTHO;
        tempCamera.orthoHeight = 360;
        tempCamera.clearFlags = Camera.ClearFlag.SOLID_COLOR; // 渲染前清空画布
        tempCamera.clearColor = Color.TRANSPARENT;
        // 设置相机渲染目标为RenderTexture
        tempCamera.targetTexture = renderTexture;
        tempCamera.rect = new Rect(0, 0, 1, 1);
        // 设置相机位置（对准Graphics节点，确保完整渲染）
        tempCameraNode.setPosition(0, 0, 1000);
        // 只渲染Graphics所在的层级（避免渲染其他节点）
        tempCamera.visibility = this.graphics.node.layer;
        // console.log("layer", this.graphics.node.layer);
        // console.log("layer", this.node.layer);

        // 执行渲染（Cocos 3.x 底层渲染API）
        // director.root.pipeline.render([tempCamera.camera]);
        // 等待两帧确保Graphics渲染完成
        this.graphics.updateRenderer();
        await new Promise(resolve => {
            director.once(Director.EVENT_AFTER_DRAW, resolve);
        });

        let texture2D: Texture2D | null = null;
        const pixels = renderTexture.readPixels();
        if (pixels && pixels.length > 0) {
            // 检查是否有非零像素
            let hasData = false;
            for (let i = 0; i < pixels.length; i++) {
                if (pixels[i] !== 0) {
                    hasData = true;
                    break;
                }
            }

            if (hasData) {
                const flippedPixels = this.flipImageDataVertically(pixels, GRAPH_SIZE.width, GRAPH_SIZE.height);
                this._randerData = flippedPixels;
                texture2D = new Texture2D();
                texture2D.reset({
                    width: GRAPH_SIZE.width,
                    height: GRAPH_SIZE.height,
                });
                texture2D.uploadData(flippedPixels);
                texture2D.updateMipmaps();
            } else {
                console.warn("Rendered texture contains only zero pixels");
            }
        } else {
            console.warn("Failed to read pixels from render texture");
        }

        // await new Promise(resolve => setTimeout(resolve, 2000));
        tempCameraNode.destroy();
        return texture2D;
    }

    // 垂直翻转图像数据
    private flipImageDataVertically(pixelData: Uint8Array, width: number, height: number): Uint8Array {
        const flippedData = new Uint8Array(pixelData.length);
        const rowBytes = width * 4; // RGBA每个像素4个字节

        for (let y = 0; y < height; y++) {
            const srcOffset = y * rowBytes;
            const dstOffset = (height - 1 - y) * rowBytes;
            for (let x = 0; x < rowBytes; x++) {
                flippedData[dstOffset + x] = pixelData[srcOffset + x];
            }
        }

        return flippedData;
    }


    async replaceSkeletonModel(skeletonModel?: sp.Skeleton, texture?: Texture2D) {
        this.skeleton.setSkin("userSkin");
        // 1. 默认参数赋值
        if (skeletonModel === undefined || null) {
            skeletonModel = this.skeleton;
        }
        if (texture === undefined || null) {
            texture = this._texture;
        }
        let setTexture = await this.resizeTexture(texture, GRAPH_SIZE.width * 2, GRAPH_SIZE.height * 2);
        this._finishTexture = setTexture;// 保存最终的贴图

        // 2. 基础校验
        if (!skeletonModel || !skeletonModel.skeletonData) {
            console.error("Spine组件或skeletonData为空！");
            return;
        }
        if (!texture) {
            console.error("替换纹理为空！");
            return;
        }

        const targetSlotName = "actorModel";
        // const targetSlotName = "left_hand";
        const slot = skeletonModel.findSlot(targetSlotName);
        if (!slot) {
            console.error(`未找到插槽【${targetSlotName}】，请核对Spine插槽名！`);
            return;
        }


        let meshAttachment = slot.getAttachment() as sp.spine.MeshAttachment;
        let regionAttachment = slot.getAttachment() as sp.spine.RegionAttachment;

        let newMeshAttachment: sp.spine.MeshAttachment = new sp.spine.MeshAttachment(meshAttachment.name);
        let newRegionAttachment: sp.spine.RegionAttachment = new sp.spine.RegionAttachment(regionAttachment.name);

        newRegionAttachment = regionAttachment.copy() as sp.spine.RegionAttachment;

        let tt = this.skeleton.skeletonData.textures[0];
        // sp.spine.TextureRegion
        this.showGeneratedTexture(setTexture);


        console.log("newRegionAttachment", newRegionAttachment.region);
        // newAttachment.copyTo(attachment);

        this.skeleton.setSlotTexture(targetSlotName, setTexture);
        slot.setToSetupPose();
        // slot.setAttachment(newRegionAttachment);

        // this.skeleton.clearAnimations();

        this.skeleton.invalidAnimationCache();
        this.skeleton.markForUpdateRenderData();

    }

    async resizeTexture(userTexture: Texture2D, targetWidth: number, targetHeight: number): Promise<Texture2D | null> {

        // 创建RenderTexture，大小和Graphics一致
        const renderTexture = new RenderTexture();
        renderTexture.reset({
            width: targetWidth,
            height: targetHeight,
        });
        //sprite
        const tempNode = new Node('TempResizeNode');
        tempNode.layer = 8;
        const sprite = tempNode.addComponent(SpriteComponent);
        sprite.spriteFrame = new SpriteFrame();
        sprite.spriteFrame.texture = userTexture;
        // 强制 Sprite 适配节点尺寸
        sprite.type = Sprite.Type.SLICED;
        tempNode.getComponent(UITransform).setContentSize(targetWidth, targetHeight);
        // 创建临时相机（专门用于渲染Graphics，不影响场景其他内容）
        // 4. 修复：Camera必须依附于Node才能正常工作（原代码直接new Camera()无效）
        const cameraNode = new Node('TempCameraNode');
        const tempCamera = cameraNode.addComponent(Camera); // 相机挂载到临时节点上
        // 设置相机参数：只渲染Graphics节点，正交相机（2D场景适配）
        tempCamera.priority = 5;
        tempCamera.projection = Camera.ProjectionType.ORTHO;
        tempCamera.orthoHeight = 360;
        tempCamera.clearFlags = Camera.ClearFlag.SOLID_COLOR; // 渲染前清空画布
        tempCamera.clearColor = Color.TRANSPARENT;
        // 设置相机渲染目标为RenderTexture
        tempCamera.targetTexture = renderTexture;
        // 只渲染Graphics所在的层级（避免渲染其他节点）
        tempCamera.visibility = tempNode.layer;
        cameraNode.setPosition(0, 0, 1000);

        this.node.parent?.addChild(tempNode);
        this.node.parent?.addChild(cameraNode);

        await new Promise(resolve => {
            director.once(Director.EVENT_AFTER_DRAW, resolve);
        });
        // await new Promise(resolve => {
        //     setTimeout(resolve, 1000);
        // });

        let texture2D: Texture2D | null = null;
        const pixels = renderTexture.readPixels();
        if (pixels && pixels.length > 0) {
            // 检查是否有非零像素
            let hasData = false;
            for (let i = 0; i < pixels.length; i++) {
                if (pixels[i] !== 0) {
                    hasData = true;
                    break;
                }
            }

            if (hasData) {
                const flippedPixels = this.flipImageDataVertically(pixels, targetWidth, targetHeight);
                this._randerData = flippedPixels;
                texture2D = new Texture2D();
                texture2D.reset({
                    width: targetWidth,
                    height: targetHeight,
                });
                texture2D.uploadData(flippedPixels);
                texture2D.updateMipmaps();

            } else {
                console.warn("Rendered texture contains only zero pixels");
            }
        } else {
            console.warn("Failed to read pixels from render texture");
        }

        // await new Promise(resolve => setTimeout(resolve, 2000));
        tempNode.destroy();
        cameraNode.destroy();
        renderTexture.destroy();
        return texture2D;
    }



}