import { _decorator, Component, Node, input, Input, EventTouch, Vec2, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('joyStickManager')
export class joyStickManager extends Component {
    private _joyStick: Node;
    private _group: Node;
    private _defaultJoyStickPos: Vec2 = new Vec2();
    private _joyStickRadius: number = 0;

    public joyStickInput: Vec2 = new Vec2();
    onLoad() {
        this._group = this.node.getChildByName("group");
        this._joyStick = this._group.getChildByName("stick");
        this._defaultJoyStickPos = new Vec2(this._group.position.x, this._group.position.y);
        //radius
        this._joyStickRadius = this._group.getComponent(UITransform).contentSize.width / 2;

        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    onTouchStart(event: EventTouch) {
        const UIPos = event.getUILocation();
        this._group.setPosition(UIPos.x, UIPos.y);
    }
    onTouchEnd(event: EventTouch) {
        this._group.setPosition(this._defaultJoyStickPos.x, this._defaultJoyStickPos.y);
        this._joyStick.setPosition(0, 0);
        this.joyStickInput = Vec2.ZERO;
    }

    onTouchMove(event: EventTouch) {
        const UIPos = event.getUILocation();
        const releativePos = new Vec2(UIPos.x - this._group.x, UIPos.y - this._group.y);
        let input = new Vec2();
        if (releativePos.length() > this._joyStickRadius) {
            releativePos.normalize();
            releativePos.multiplyScalar(this._joyStickRadius);
        }
        this._joyStick.setPosition(releativePos.x, releativePos.y);

        input = releativePos.clone();
        input.normalize();
        this.joyStickInput = input.clone();
        // console.log(this.joyStickInput);
    }
}


