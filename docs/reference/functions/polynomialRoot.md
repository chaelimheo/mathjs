---
layout: default
---

<!-- Note: This file is automatically generated from source code comments. Changes made in this file will be overridden. -->

<h1 id="function-polynomialroot">Function polynomialRoot <a href="#function-polynomialroot" title="Permalink">#</a></h1>

Finds the numerical values of the distinct roots of a polynomial with real or complex coefficients.
Currently operates only on linear, quadratic, and cubic polynomials using the standard
formulas for the roots.


<h2 id="syntax">Syntax <a href="#syntax" title="Permalink">#</a></h2>

```js
math.polynomialRoot(constant, linearCoeff, quadraticCoeff, cubicCoeff)
```

<h3 id="parameters">Parameters <a href="#parameters" title="Permalink">#</a></h3>

Parameter | Type | Description
--------- | ---- | -----------
`coeffs` | ... number &#124; Complex |  The coefficients of the polynomial, starting with with the constant coefficent, followed by the linear coefficient and subsequent coefficients of increasing powers.

<h3 id="returns">Returns <a href="#returns" title="Permalink">#</a></h3>

Type | Description
---- | -----------
Array | The distinct roots of the polynomial


<h3 id="throws">Throws <a href="#throws" title="Permalink">#</a></h3>

Type | Description
---- | -----------


<h2 id="examples">Examples <a href="#examples" title="Permalink">#</a></h2>

```js
// linear
math.polynomialRoot(6, 3)                                        // [-2]
math.polynomialRoot(math.complex(6,3), 3)                        // [-2 - i]
math.polynomialRoot(math.complex(6,3), math.complex(2,1))        // [-3 + 0i]
// quadratic
math.polynomialRoot(2, -3, 1)                                    // [2, 1]
math.polynomialRoot(8, 8, 2)                                     // [-2]
math.polynomialRoot(-2, 0, 1)                                    // [1.4142135623730951, -1.4142135623730951]
math.polynomialRoot(2, -2, 1)                                    // [1 + i, 1 - i]
math.polynomialRoot(math.complex(1,3), math.complex(-3, -2), 1)  // [2 + i, 1 + i]
// cubic
math.polynomialRoot(-6, 11, -6, 1)                               // [1, 3, 2]
math.polynomialRoot(-8, 0, 0, 1)                                 // [-1 - 1.7320508075688774i, 2, -1 + 1.7320508075688774i]
math.polynomialRoot(0, 8, 8, 2)                                  // [0, -2]
math.polynomialRoot(1, 1, 1, 1)                                  // [-1 + 0i, 0 - i, 0 + i]
```


<h2 id="see-also">See also <a href="#see-also" title="Permalink">#</a></h2>

[cbrt](cbrt.html),
[sqrt](sqrt.html)