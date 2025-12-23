import { _decorator, Component } from "cc";
import { EntityStateEnum } from "../Enum/Enum";
import StateMachine from "./StateMachine";
const { ccclass, property } = _decorator;

@ccclass("EntityManager")
export abstract class EntityManager extends Component {
  fsm: StateMachine;
  private _state: EntityStateEnum;

  get state() {
    //state依赖动画机，加判断
    if (!this.fsm) {
      return null;
    }
    return this._state;
  }

  set state(newState) {
    if (!this.fsm) {
      return;
    }
    this._state = newState;
    this.fsm.setParams(newState, true);
  }

  abstract init(...args: any[]): void;
}
