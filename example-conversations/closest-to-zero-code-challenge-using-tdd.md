# Conversation: Solving "Find Closest to Zero" Code Challenge

**Summary:** User works through solving a code challenge: given a list of integers, find the closest to zero. If there is a tie, choose the positive value. (challenge from [cyber-dojo.org](https://cyber-dojo.org))

**Commands:** `/red` `/green` `/refactor`
**Legend:** 🔴 Red (test fails) | 🟢 Green (test passes) | 🔵 Refactor (cleanup)

---

👤 `/red` single element [1] returns 1

🔴 *writes test*
```typescript
expect(closestToZero([1])).toBe(1);
```
FAIL: closestToZero is not defined

👤 `/green`

🟢 *returns hardcoded 1*
```typescript
function closestToZero(nums: number[]): number {
  return 1; // minimal - only need to pass current test
}
```
✅ Test passes

👤 `/red` two numbers [3, 2] returns 2

🔴 *writes test*
```typescript
expect(closestToZero([3, 2])).toBe(2);
```
FAIL: expected 1 to be 2

👤 `/green`

🟢 *sorts and returns first*
```typescript
function closestToZero(nums: number[]): number {
  return nums.sort((a, b) => a - b)[0]; // minimal
}
```
✅ 2/2 tests pass

👤 `/red` with negative [-3, 2] returns 2

🔴 *writes test*
```typescript
expect(closestToZero([-3, 2])).toBe(2);
```
FAIL: expected -3 to be 2 (regular sort puts -3 first)

👤 `/green`

🟢 *sorts by absolute value*
```typescript
function closestToZero(nums: number[]): number {
  return nums.sort((a, b) => Math.abs(a) - Math.abs(b))[0];
}
```
✅ 3/3 tests pass

👤 `/red` exact tie [-2, 2] returns positive 2

🔴 *writes test*
```typescript
expect(closestToZero([-2, 2])).toBe(2);
```
FAIL: expected -2 to be 2 (returns first when tied)

👤 `/green`

🟢 *adds tie-breaking: prefer positive*
```typescript
function closestToZero(nums: number[]): number {
  return nums.sort((a, b) => {
    const diff = Math.abs(a) - Math.abs(b);
    return diff !== 0 ? diff : b - a;
  })[0];
}
```
✅ 4/4 tests pass

👤 `/refactor` extract helper and use iteration instead of sort

🔵 *extracts helper function for comparison logic*
```typescript
function isCloser(candidate: number, current: number): boolean {
  const candAbs = Math.abs(candidate);
  const currAbs = Math.abs(current);
  return candAbs < currAbs || (candAbs === currAbs && candidate > current);
}

function closestToZero(nums: number[]): number {
  if (nums.length === 0) return 0;
  let closest = nums[0];
  for (const num of nums) {
    if (isCloser(num, closest)) {
      closest = num;
    }
  }
  return closest;
}
```
✅ 4/4 tests still pass

👤 `/refactor`

🔵 *uses reduce for more functional style*
```typescript
function closestToZero(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((closest, num) =>
    isCloser(num, closest) ? num : closest
  );
}
```
✅ 4/4 tests still pass
