/*
 * Copyright (C) 2007 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
///<reference path="Interpolator.ts"/>

module android.view.animation{
    /**
     * Repeats the animation for a specified number of cycles. The
     * rate of change follows a sinusoidal pattern.
     *
     */
    export class CycleInterpolator implements Interpolator{
        private mCycles:number;
        constructor(mCycles:number) {
            this.mCycles = mCycles;
        }

        getInterpolation(input:number):number {
            return (Math.sin(2 * this.mCycles * Math.PI * input));
        }
    }
}