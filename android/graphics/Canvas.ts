/**
 * Created by linfaxin on 15/10/13.
 */
///<reference path="../util/Pools.ts"/>
///<reference path="../util/Log.ts"/>
///<reference path="Rect.ts"/>
///<reference path="Color.ts"/>
module android.graphics {
    import Pools = android.util.Pools;
    import Log = android.util.Log;
    import Rect = android.graphics.Rect;
    import Color = android.graphics.Color;

    export class Canvas {
        private mCanvasElement:HTMLCanvasElement;
        private _mCanvasContent:CanvasRenderingContext2D;
        private _saveCount = 0;
        private mCurrentClip:Rect;
        private shouldDoRectBeforeRestoreMap = new Map<number, Array<Rect>>();
        private mClipStateMap = new Map<number, Rect>();


        private static sPool = new Pools.SynchronizedPool<Canvas>(10);

        constructor(width:number, height:number) {
            this.mCanvasElement = document.createElement("canvas");
            this.init(width, height);
        }

        private init(width:number, height:number) {
            this.mCanvasElement.width = width;
            this.mCanvasElement.height = height;
            this._mCanvasContent = this.mCanvasElement.getContext("2d");
            this.mCurrentClip = null;
            this._saveCount = 0;

            //let content = this._mCanvasContent;
            //function logMethod (old){
            //    return function(...args){
            //        Log.d('canvas', old.name+"("+args+")");
            //        old.call(content, ...args);
            //    };
            //}
            //
            //content.save = logMethod(content.save);
            //content.restore = logMethod(content.restore);
            //content.rect = logMethod(content.rect);
            //content.clip = logMethod(content.clip);
            //content.translate = logMethod(content.translate);
            //content.fillRect = logMethod(content.fillRect);

            this.fullRect();//ready for clip bound
            this._mCanvasContent.clip();
            this._mCanvasContent.save();
        }

        recycle() {
            this.mCanvasElement.width = 0;
            this.mCanvasElement.height = 0;
            Canvas.sPool.release(this);
        }

        public get canvasElement():HTMLCanvasElement {
            return this.mCanvasElement;
        }

        public getHeight():number {
            return this.mCanvasElement.height;
        }

        public getWidth():number {
            return this.mCanvasElement.width;
        }

        public static obtain(width:number, height:number):Canvas {
            let canvas = Canvas.sPool.acquire();
            if (canvas == null) canvas = new Canvas(width, height);
            else {
                canvas.init(width, height);
            }
            return canvas;
        }

        translate(dx:number, dy:number):void {
            this._mCanvasContent.translate(dx, dy);
        }

        scale(sx:number, sy:number, px?:number, py?:number):void {
            if (px && py) this.translate(px, py);
            this._mCanvasContent.scale(sx, sy);
            if (px && py) this.translate(-px, -py);
        }

        rotate(degrees:number, px?:number, py?:number) {
            if (px && py) this.translate(px, py);
            this._mCanvasContent.rotate(degrees);
            if (px && py) this.translate(-px, -py);
        }

        drawRGB(r:number, g:number, b:number) {
            this._mCanvasContent.fillStyle = `rgb(${r},${g},${b})`;
            this._mCanvasContent.fillRect(0, 0, this.getWidth(), this.getHeight());
        }

        drawARGB(a:number, r:number, g:number, b:number) {
            this._mCanvasContent.fillStyle = `rgba(${r},${g},${b},${a})`;
            this._mCanvasContent.fillRect(0, 0, this.getWidth(), this.getHeight());
        }

        drawColor(color:number){
            this.drawARGB(Color.alpha(color), Color.red(color), Color.green(color), Color.blue(color));
        }

        clearColor(){
            this._mCanvasContent.clearRect(0, 0, this.getWidth(), this.getHeight());
        }


        save():number {
            this._mCanvasContent.save();
            if(this.mCurrentClip) this.mClipStateMap.set(this._saveCount, new Rect(this.mCurrentClip));
            this._saveCount++;

            return this._saveCount;
        }

        restore() {
            let doRects = this.shouldDoRectBeforeRestoreMap.get(this._saveCount);
            if(doRects && doRects.length>0){
                doRects.forEach((rect:Rect)=>{
                    this._mCanvasContent.rect(rect.left, rect.top, rect.width(), rect.height());
                });
                if(doRects.length%2 == 1){
                    this.fullRect();
                }
                this.shouldDoRectBeforeRestoreMap.delete(this._saveCount);
            }


            this._saveCount--;
            this._mCanvasContent.restore();
            let savedClip = this.mClipStateMap.get(this._saveCount);
            if(savedClip){
                this.mClipStateMap.delete(this._saveCount);
                this.mCurrentClip.set(savedClip);
            }
        }

        restoreToCount(saveCount:number) {
            if (saveCount < 0) throw Error('saveCount can\'t < 0');
            while (saveCount <= this._saveCount) {
                this.restore();
            }
        }

        getSaveCount():number {
            return this._saveCount;
        }

        private fullRect(){
            this._mCanvasContent.rect(0, 0, this.getWidth(), this.getHeight());
        }

        clipRect(rect:Rect):boolean;
        clipRect(left:number, top:number, right:number, bottom:number):boolean;
        clipRect(...args):boolean {
            if (!this.mCurrentClip) this.mCurrentClip = new Rect();
            let rect = this.mCurrentClip;

            if (args.length === 1) {
                rect.set(args[0]);
            } else {
                let [left=0, top=0, right=0, bottom=0] = args;
                rect.set(left, top, right, bottom);
            }
            this._mCanvasContent.rect(rect.left, rect.top, rect.width(), rect.height());
            this.fullRect();
            this._mCanvasContent.clip('evenodd');

            let doRects = this.shouldDoRectBeforeRestoreMap.get(this._saveCount);
            if(!doRects){
                doRects = [];
                this.shouldDoRectBeforeRestoreMap.set(this._saveCount, doRects);
            }
            doRects.push(new Rect(rect));

            return rect.isEmpty();
        }

        getClipBounds(bounds?:Rect):Rect {
            if (!this.mCurrentClip) this.mCurrentClip = new Rect();
            let rect = bounds || new Rect();
            rect.set(this.mCurrentClip);
            return rect;
        }

        quickReject(rect:Rect):boolean;
        quickReject(left:number, top:number, right:number, bottom:number):boolean;
        quickReject(...args):boolean {
            if (!this.mCurrentClip) return false;
            if (args.length == 1) {
                return !this.mCurrentClip.intersects(<Rect>args[0]);
            } else {
                let [left=0, t=0, right=0, bottom=0] = args;
                return !this.mCurrentClip.intersects(left, t, right, bottom);
            }
        }

        drawCanvas(canvas:Canvas, offsetX:number, offsetY:number, width?:number, height?:number, canvasOffsetX?:number,
                   canvasOffsetY?:number, canvasImageWidth?:number, canvasImageHeight?:number):void {
            this._mCanvasContent.drawImage(canvas.canvasElement, offsetX, offsetY, width, height,
                canvasOffsetX, canvasOffsetY, canvasImageWidth, canvasImageHeight);
        }
    }
}