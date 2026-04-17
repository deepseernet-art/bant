/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ShirtSize = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';
export interface Order {
  id: string;
  studentName: string;
  shirtSize: ShirtSize;
  nickname: string;
  uid?: string;
  userEmail?: string;
  createdAt: string;
}
