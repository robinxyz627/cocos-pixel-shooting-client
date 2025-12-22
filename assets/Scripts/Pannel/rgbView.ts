import { _decorator, Color, Component, Node, SliderComponent, sp, SpriteComponent, SpriteFrame, UITransform, Vec3 } from 'cc';
import { rgbSlider } from './rgbSlider';
const { ccclass, property } = _decorator;

@ccclass('rgbView')
export class rgbView extends Component {
    private static _instance: rgbView = null;

    private viewColor: Color = null;
    private viewColorCp: SpriteComponent = null;

    private slider: rgbSlider = null;

    @property(Node)
    private rgbExamplePannel: Node = null;
    public static get instance() {
        if (!this._instance) {
            this._instance = new rgbView();
        }
        return this._instance;
    }
    start() {
        if (!rgbView._instance) {
            rgbView._instance = this;
        }
        this.slider = rgbSlider.instance;
        this.viewColorCp = this.node.getComponent(SpriteComponent);
        if (!this.rgbExamplePannel || !this.viewColorCp) {
            console.error('rgbView:start error');
        }
        //TODO点击Input注册
        this.rgbExamplePannel.on(Node.EventType.TOUCH_START, this.onTouchStart, this);

        this.setChildrenColor(63, 4);
    }

    private counter: number = 0;
    update(deltaTime: number) {
        this.counter += deltaTime;
        if (this.counter > 0.1) {
            this.vColor = this.slider.rgb;
            this.counter = 0;
        }

    }

    //0,63,127,191,255
    setChildrenColor(step: number, gridSize: number) {
        let count: number = 0;
        this.rgbExamplePannel.children.forEach(child => {
            const sp = child.getComponent(SpriteComponent);
            let r = 0, g = 0, b = 0;

            if (sp) {
                const stageIndex = Math.floor(count / gridSize); // 当前处于哪个阶段(0-3)
                const stepIndex = count % gridSize;             // 阶段内的第几个节点(0-3)

                switch (stageIndex) {
                    case 0: // 第一阶段：g从0增加到255
                        r = 255;
                        g = stepIndex * step;
                        b = 0;
                        break;
                    case 1: // 第二阶段：r从255减少到0
                        r = 255 - stepIndex * step;
                        g = 255;
                        b = 0;
                        break;
                    case 2: // 第三阶段：b从0增加到255
                        r = 0;
                        g = 255;
                        b = stepIndex * step;
                        break;
                    case 3: // 第四阶段：g从255减少到0
                        r = 0;
                        g = 255 - stepIndex * step;
                        b = 255;
                        break;
                }

                // 确保颜色值在有效范围内
                r = Math.min(255, Math.max(0, r));
                g = Math.min(255, Math.max(0, g));
                b = Math.min(255, Math.max(0, b));

                sp.color = new Color(r, g, b, 255);
                console.log('rgbView:setChildrenColor:', r, g, b, child.name, count);
            }
            count++;
        });
    }

    get vColor() {
        return this.viewColor;
    }

    set vColor(value: Color) {
        this.viewColor = value;
        //组件颜色
        this.viewColorCp.color = this.viewColor;
        this.node.getComponent(SpriteComponent).color = this.viewColor;
    }
    onTouchStart(event: any) {
        console.log('rgbView:onTouchStart:', event.getLocation());
        const location: Vec3 = new Vec3(event.getUILocation().x, event.getUILocation().y, 0);
        const localPoint = this.rgbExamplePannel.getComponent(UITransform).convertToNodeSpaceAR(location);

        //判断点的哪个色块,目前是4*4，色块大小为改节点大小的16分之1
        const gridSize = 4;
        const gridWidth = this.rgbExamplePannel.getComponent(UITransform).width / gridSize;
        const xIndex = Math.floor(localPoint.x / gridWidth);//0~3
        const yIndex = Math.floor(localPoint.y / gridWidth);
        //计算索引
        const index = yIndex * gridSize + xIndex;
        //设置view颜色
        this.viewColor = this.rgbExamplePannel.children[index].getComponent(SpriteComponent).color.clone();
        this.node.getComponent(SpriteComponent).color = this.viewColor;
        //同步拖动条
        rgbSlider.instance.rgb = this.viewColor;
    }

}


