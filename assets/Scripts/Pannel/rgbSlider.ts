import { _decorator, Color, Component, Node, Slider } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('rgbSlider')
export class rgbSlider extends Component {
    @property(Slider)
    slider_R: Slider = null;

    @property(Slider)
    slider_G: Slider = null;

    @property(Slider)
    slider_B: Slider = null;
    private static _instance: rgbSlider = null;
    public static get instance() {
        if (!this._instance) {
            this._instance = new rgbSlider();
        }
        return this._instance;
    }

    protected onLoad(): void {
        if (!rgbSlider._instance) {
            rgbSlider._instance = this;
        }
        if (!rgbSlider._instance.slider_R || !rgbSlider._instance.slider_G || !rgbSlider._instance.slider_B) {
            console.error("请检查rgbSlider组件的绑定");
        }
        //init
        this.rgb = new Color(255, 0, 0);
    }
    start() {

    }

    reNormalize(value: number): number {
        return Math.floor(value * 255) <= 255 ? Math.floor(value * 255) : 255;
    }

    normalize(value: number): number {
        return value / 255;
    }
    get rgb(): Color {
        return new Color(this.reNormalize(this.slider_R.progress),
            this.reNormalize(this.slider_G.progress),
            this.reNormalize(this.slider_B.progress));
    }

    set rgb(value: Color) {
        this.slider_R.progress = this.normalize(value.r);
        this.slider_G.progress = this.normalize(value.g);
        this.slider_B.progress = this.normalize(value.b);
    }
}


