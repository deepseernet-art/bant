/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ShirtSize = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';
export type PantSize = '3부' | '5부' | '3XL' | 'None';

export interface Order {
  id: string;
  studentName: string;
  shirtSize: ShirtSize;
  hasPants: boolean;
  pantsSize: PantSize;
  nickname: string;
  createdAt: string;
}
