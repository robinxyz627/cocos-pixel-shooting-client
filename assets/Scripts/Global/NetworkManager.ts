import { _decorator, Component, Node } from 'cc';
import Singleton from '../Base/Singleton';
import { IModel } from '../Common/Model';

interface IListenItem {
    cb: (data: any) => void,
    ctx: unknown,
}

export interface ICallApiRet<T> {
    success: boolean,
    res?:T,
    error?:Error,
}

export class NetworkManager extends Singleton {
    static get Instance(){
        return super.GetInstance<NetworkManager>();
    }

    //Nginx 有个默认行为：当请求一个 “目录路径” 但末尾不带斜杠时，会自动返回 301 重定向，要求客户端补全末尾斜杠（即把 /ws 重定向到 /ws/）
    url = "ws://vinegarzhi.xyz/ws/";
    ws: WebSocket = null;
    private map: Map<string, Array<IListenItem>> = new Map();

    isConnect: boolean = false;
    intervalId: number = null;
    public async connect() {
        return new Promise((resolve, reject) => {
            if(this.isConnect){
                resolve(true);
                return;
            }
            this.ws = new WebSocket(this.url);
            this.ws.onopen = () => {
                this.isConnect = true;
                console.log("open");
                resolve(true);
            };
            this.ws.onmessage = (e) => {
                try {
                    const obj = JSON.parse(e.data);
                    const {name,data} = obj;
                    // console.log("onmessage", obj);
                    if (this.map.has(name)) {
                        this.map.get(name).forEach(({cb,ctx}) => {
                            cb.call(ctx, data);
                        });
                    }
                } catch (error) {
                    console.log("onmessage error", error);
                }
            };
            this.ws.onclose = () => {
                this.isConnect = false;
                console.log("close");
                resolve(false);
            }
            this.ws.onerror = (e) => {
                this.isConnect = false;
                console.log("error", e);
                resolve(false);
            }
        })
    }

    /**
     * 仿照http的登陆请求，封装成promise函数
     * 泛型约束
     * 对内部使用的函数则用as any避免报错
     * @param name 
     * @param data 
     */
    public callApi<T extends keyof IModel['api']>(name:T,data: IModel['api'][T]['req']): Promise<ICallApiRet<IModel['api'][T]['res']>> {
        return new Promise((resolve) => {
            try{
                const timeOut = setTimeout(() => {
                    resolve({success:false,error:new Error("timeout!")});
                    this.unlistenMsg(name as any,cb,null);
                }, 5000);
                const cb = (res)=>{ 
                    resolve(res);
                    clearTimeout(timeOut);
                    this.unlistenMsg(name as any,cb,null);
                };
                this.listenMsg(name as any,cb,null);
                this.sendMsg(name as any,data);
            } catch (error) { 
                resolve({success:false,error});
            } 
        }) 
    }

    public async sendMsg<T extends keyof IModel['msg']>(name:T,data: IModel['msg'][T]) {
        const msg = {name,data};
        //加入随机延迟测试
        // await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        this.ws.send(JSON.stringify(msg));
    }

    public listenMsg<T extends keyof IModel['msg']>(name:T,cb:(args:IModel['msg'][T])=>void,ctx:unknown){
        if(this.map.has(name)){
            this.map.get(name).push({cb,ctx})
        }else{
            this.map.set(name,[{cb,ctx}])
        }
    }

    public unlistenMsg<T extends keyof IModel['msg']>(name:T,cb:(args:IModel['msg'][T])=>void,ctx:unknown){
        if(this.map.has(name)){
            const index = this.map.get(name).findIndex(i=>i.cb === cb && i.ctx === ctx);
            index > -1 && this.map.get(name).splice(index,1);
        }
    }

    /**
     * 创建周期性连接任务
     * 默认5秒一次检测是否断开，若断开则重连
     * @param interval 
     */
    public connectMissionStart(interval: number = 5000){
        if(this.intervalId!== null) {
            clearInterval(this.intervalId);
        }
        this.intervalId = setInterval(()=>{
            if(!this.isConnect){
                this.connect();
            }
        },interval) as unknown as number;
    }

        /**
     * 去除周期性连接任务
     * @param none
     */
    public connectMissionStop(){ 
        //停止定时器
        if(this.intervalId !== null){
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}


