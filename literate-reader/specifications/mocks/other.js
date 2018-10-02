/**
 
This is a test

        To see how this looks
```
What will this look like?

```



 */

// What about this?
// And this?


const j = () => //how about this
    true

const k = () => // and this?
    true

const letsGetWeird = () => /* hello */ true // hello

/**
 * Ok What about these messages
 * are these the same?
 */

 /**
 *What about these
 *How would this look?
 */

 /**
    This is a test
    To see how this looks

    ```typescript
    const b: string = 'hello'
    ```
 */

 /*** ===================================================================== ***\
 ** - LISTS --------------------------------------------------------------- **
 * ========================================================================= *
 *                  *     _______________________                            *
 *                    ()=(_______________________)=()           *            *
 *       *                |                     |                            *
 *                        |   ~ ~~~~~~~~~~~~~   |       *               *    *
 *             *          |                     |                            *
 *   *                    |   ~ ~~~~~~~~~~~~~   |         *                  *
 *                        |                     |                            *
 *                        |   ~ ~~~~~~~~~~~~~   |                 *          *
 *        *               |                     |                            *
 *                   *    |_____________________|         *        *         *
 *                    ()=(_______________________)=()                        *
 **                                                                         **
\*** ===================================================================== ***/


/**
 * Creates an object composed of keys generated from the results of running
 * each element of `collection` thru `iteratee`. The corresponding value of
 * each key is the number of times the key was returned by `iteratee`. The
 * iteratee is invoked with one argument: (value).
 *
 * @static
 * @memberOf _
 * @since 0.5.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [iteratee=_.identity] The iteratee to transform keys.
 * @returns {Object} Returns the composed aggregate object.
 * @example
 *
 * _.countBy([6.1, 4.2, 6.3], Math.floor);
 * // => { '4': 1, '6': 2 }
 *
 * // The `_.property` iteratee shorthand.
 * _.countBy(['one', 'two', 'three'], 'length');
 * // => { '3': 2, '5': 1 }
 */
var countBy = createAggregator(function(result, value, key) {
    if (hasOwnProperty.call(result, key)) {
        ++result[key];
    } else {
        baseAssignValue(result, key, 1);
    }
});