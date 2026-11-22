// Stub of the motion/react package.
//
// The components of the react-bits collection import the animation hooks of
// Motion. The checks of the test suite only look at the pure functions of the
// application, so no animation ever has to run. The stub offers the names that
// those components import, and every one of them does the smallest thing that
// keeps the module loadable and the call harmless.
//
// The components are never rendered by the checks, so the fake elements of the
// motion object only have to exist.

// A motion value that never moves. It answers the questions of the components
// with the value it was created with.
function createMotionValue(initial) {
    return {
        get: () => initial,
        set: () => {},
        jump: () => {},
        stop: () => {},
        isAnimating: () => false,
        getVelocity: () => 0,
    }
}

// The reduced motion is a setting of the system. The stub always says no.
export function useReducedMotion() {
    return false
}

export function useMotionValue(initial) {
    return createMotionValue(initial)
}

export function useSpring(initial, config) {
    return createMotionValue(initial)
}

// The transformed value is a number in the components. The stub only has to
// return something that can be called.
export function useTransform() {
    return () => 0
}

// The template is used as a tagged template, so the strings come first and the
// values follow them.
export function useMotionTemplate(strings, ...values) {
    return () => {
        if (typeof strings === 'string') {
            return strings
        }
        return strings.reduce((text, part, index) => {
            const value = values[index]
            const shown = value && typeof value.get === 'function' ? value.get() : value
            return text + part + (shown === undefined ? '' : String(shown))
        }, '')
    }
}

// The animation does not run. The components only stop it, which is harmless.
export function animate() {
    return { stop() {} }
}

// A fake element. The name is only there to make a broken bundle readable.
function fakeElement(name) {
    const element = () => null
    element.displayName = name
    return element
}

const elements = {
    div: fakeElement('motion.div'),
    span: fakeElement('motion.span'),
}

// Every other name of the motion object is a fake element as well, so that a
// component that uses another tag does not break the bundle.
export const motion = new Proxy(elements, {
    get(target, key) {
        if (key in target) {
            return target[key]
        }
        return fakeElement(`motion.${String(key)}`)
    },
})
