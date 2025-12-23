import { SpriteFrame } from "cc";

const INDEX_REG = /\((\d+)\)/;

const getNumberWithinString = (str: string) => parseInt(str.match(INDEX_REG)?.[1] || "0");

export const sortSpriteFrame = (spriteFrame: Array<SpriteFrame>) =>
  spriteFrame.sort((a, b) => getNumberWithinString(a.name) - getNumberWithinString(b.name));

/**
 * 弧度转角度
 * @param rad 
 * @returns [0,360]
 */
export const radToAngle = (rad: number) =>{
  return rad * 180 / Math.PI;
}

export const deepClone = (obj: any) => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  const result = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj,key)){
      result[key] = deepClone(obj[key]);
    }
  }
  return result;
}

export const fakeRandom = (seed:number)=>{
  return (seed * 9301 + 49297) % 233280;
}

//字符串全部小写
export const toLowerCase = (str:string)=>{
  return str.toLowerCase();
}
