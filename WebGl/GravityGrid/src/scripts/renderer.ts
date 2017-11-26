declare function require(name: string): string;
const vertexShaderSource: string = (() =>
    require('./glsl/2d-vertex-shader.glsl'))();
const fragmentShaderSource: string = (() =>
    require('./glsl/2d-fragment-shader.glsl'))();

export interface IRenderable {
    renderOnCanvas(canvas: HTMLElement): void;
}

import { Press } from "./Press"

class Renderer implements IRenderable {
    private gl: WebGLRenderingContext | null;
    private program: WebGLProgram | null;
    private canvas: HTMLCanvasElement;
    private start: number = new Date().getTime();
    
    private idMapper: number[] = Array(0);
    private presses : Press[] = Array(6); // mouse + 5 touch points.

    public renderOnCanvas(div: HTMLElement): void {
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        div.appendChild(this.canvas);
        this.gl = this.canvas.getContext('experimental-webgl');
        window.onload = () => this.init();
    }

    private remove(array:Press[], element:number): void {
        let index = -1;
        for(let i = 0; i<array.length; i++) {
            if(array[i].id === element) {
                index = i;
                break;
            }
        }
        if (index>-1) {
            array.splice(index,1);
        }
    }

    private takeFirstFreeIndex(id:number) : number {
        for (let i = 1; i < this.presses.length; i++) {
            if (!this.presses[i] || this.presses[i].id === -1) {
                this.idMapper[id] = i;
                return i;
            }
        }
        return -1;
    }

    private getMousePos(canvas: HTMLCanvasElement, evt: Event): { x: number; y: number } {
        const rect: ClientRect = canvas.getBoundingClientRect();
        const mouseEvt: MouseEvent = evt as MouseEvent;
        return {
            x:
                (mouseEvt.clientX - rect.left) /
                (rect.right - rect.left) *
                canvas.width,
            y:
                (mouseEvt.clientY - rect.bottom) /
                (rect.top - rect.bottom) *
                canvas.height,
        };
    }

    private getTouchPos(canvas: HTMLCanvasElement, touch: Touch): { x: number; y: number } {
        const rect: ClientRect = canvas.getBoundingClientRect();
        return {
            x:
                (touch.clientX - rect.left) /
                (rect.right - rect.left) *
                canvas.width,
            y:
                (touch.clientY - rect.bottom) /
                (rect.top - rect.bottom) *
                canvas.height,
        };
    }

    private viewportToPixels(value: string, isHeight: boolean): number {
        const parts: RegExpMatchArray | null = value.match(/([0-9\.]+)(vh|vw)/);
        if (parts) {
            const q: number = Number(parts[1]);
            if (isHeight) {
                return window.innerHeight * (q / 100);
            } else {
                return window.innerWidth * (q / 100);
            }
        }
        return 0;
    }

    private getSize(): void {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    private setTimedInterval(callback: () => void, delay: number, timeout: number): void {
        const id: number = window.setInterval(callback, delay);
        window.setTimeout(() => {
            window.clearInterval(id);
        }, timeout);
    }

    private addListeners(): void {
        this.canvas.addEventListener('mouseenter', evt => {
            this.presses[0] = new Press(0);
        }, false);

        this.canvas.addEventListener('mousemove', evt => {
            if (!this.presses[0]) {
                this.presses[0] = new Press(0);
            }
            this.presses[0].old = this.presses[0].current;
            this.presses[0].current = this.getMousePos(this.canvas, evt);
        }, false);

        this.canvas.addEventListener('mouseleave', evt => {
            this.presses[0].isDead = true;
        }, false);

        this.canvas.addEventListener('touchstart', evt => {
            evt.preventDefault();
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i<evt.changedTouches.length; i++) {
                const touch: Touch = evt.changedTouches[i];
                const id = this.takeFirstFreeIndex(touch.identifier);
                if (id >= 0) {
                    const press: Press = new Press(id);
                    press.current = this.getTouchPos(this.canvas, touch);
                    press.old = press.current;

                    this.presses[press.id] = press;
                }
            }
        }, false);

        this.canvas.addEventListener('touchmove', evt => {
            evt.preventDefault();            
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i<evt.changedTouches.length; i++) {
                const touch: Touch = evt.changedTouches[i];
                const id = this.idMapper[touch.identifier];
                if (id>=0) {
                    const press: Press = this.presses[id];
                    press.old = press.current;
                    press.current = this.getTouchPos(this.canvas, touch);
                }
            }
        }, false);

        this.canvas.addEventListener('touchend', evt => {
            evt.preventDefault();            
            const ids: number[] = Array();
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i<evt.changedTouches.length; i++) {
                const touch: Touch = evt.changedTouches[i];
                const id = this.idMapper[touch.identifier];
                if (id>=0) {
                    const press: Press = this.presses[id];
                    press.delta = { x: press.current.x - press.old.x, y: press.current.y - press.old.y };
                    press.isDead = true;
                    ids.push(id);
                }
            }
            
            this.setTimedInterval(() => {
                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i<ids.length; i++) {
                    const id = ids[i];
                    if (id>=0) {
                        const press: Press = this.presses[id];
                        press.current = { 
                            x: press.current.x + press.delta.x * press.power / 250, 
                            y: press.current.y + press.delta.y * press.power / 250
                        };
                    }
                }
            }, 18, 1000);
            setTimeout(() => {
                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i<ids.length; i++) {
                    const id = ids[i];
                    this.presses[id] = new Press(-1);
                }
            }, 2000);
        }, false);

        window.onresize = () => setTimeout(() => this.getSize(), 1);
    }
    
    private init(): void {
        let vertexShader: WebGLShader | null;
        let fragmentShader: WebGLShader | null;
        this.addListeners();
        this.getSize();
        if (this.gl) {
            const buffer: WebGLBuffer | null = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(
                this.gl.ARRAY_BUFFER,
                new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,]),
                this.gl.STATIC_DRAW
            );
            this.gl.viewport(0, 0,
                this.gl.drawingBufferWidth,
                this.gl.drawingBufferHeight
            );
            vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
            this.gl.shaderSource(vertexShader, vertexShaderSource);
            this.gl.compileShader(vertexShader);
            fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
            this.gl.shaderSource(fragmentShader, fragmentShaderSource);
            this.gl.compileShader(fragmentShader);
            this.program = this.gl.createProgram();
            this.gl.attachShader(this.program, vertexShader);
            this.gl.attachShader(this.program, fragmentShader);
            this.gl.linkProgram(this.program);
            this.gl.useProgram(this.program);
            this.render();
        }
    }

    private addGLProperties(): void {
        if (this.gl) {
            const positionLocation: number = this.gl.getAttribLocation(this.program, 'position');
            this.gl.enableVertexAttribArray(positionLocation);
            this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, true, 0, 0);
            
            const resolutionPosition: WebGLUniformLocation | null = this.gl.getUniformLocation(this.program, 'resolution');
            this.gl.uniform2f(resolutionPosition, this.canvas.width, this.canvas.height);
            
            const rotationPosition: WebGLUniformLocation | null = this.gl.getUniformLocation(this.program, 'rotation');
            this.gl.uniform2f(rotationPosition, 0.5, 0.8);
            
            const timePosition: WebGLUniformLocation | null = this.gl.getUniformLocation(this.program, 'time');
            this.gl.uniform1f(timePosition, (new Date().getTime() - this.start) / 1000);

            const gravityPosition: WebGLUniformLocation | null = this.gl.getUniformLocation(this.program, 'gravity');
            this.gl.uniform1f(gravityPosition, 50);

            const reachPosition: WebGLUniformLocation | null = this.gl.getUniformLocation(this.program, 'reach');
            this.gl.uniform1f(reachPosition, 10000);

            const offsetPosition: WebGLUniformLocation | null = this.gl.getUniformLocation(this.program, 'offset');
            this.gl.uniform2f(offsetPosition, 0, 0);
            
            const pitchPosition: WebGLUniformLocation | null = this.gl.getUniformLocation(this.program, 'pitch');
            this.gl.uniform2f(pitchPosition, 80, 80);

            let presses: number = 0;
            for (let i: number = 0; i<7; i++) {
                if (this.presses[i] && this.presses[i].id !== -1) {
                    const pressPosition: WebGLUniformLocation | null = this.gl.getUniformLocation(this.program, "presses["+presses+"]");
                    this.gl.uniform3f(pressPosition, this.presses[i].current.x, this.presses[i].current.y, this.presses[i].power/200);
                    presses++;
                }
            }

            const amtPressesPosition: WebGLUniformLocation | null = this.gl.getUniformLocation(this.program, 'amtPresses');
            this.gl.uniform1i(amtPressesPosition, presses);
        }
    }

    private render(): void {
        if (this.gl) {
            this.addGLProperties();
            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
            requestAnimationFrame(() => this.render());

            for(const press of this.presses) {
                if (press && press.isDead && press.power > 0) {
                    press.power -= 2;
                } else if (press && !press.isDead && press.power < 200) {
                    press.power += 7;
                }
            }
        }
    }
}

export { Renderer };
