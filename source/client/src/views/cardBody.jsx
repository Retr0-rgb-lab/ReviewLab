// The back of a card is plain text with three marks.
//
// **bold** and *italic* do not nest: the inside of a mark is copied as text,
// so a star in there is not another mark. A line that starts with "- " is
// one bullet. A star that does not close, and any other character, stays
// text. The result is elements, never an HTML string.
//
// React is imported because the check runner compiles JSX to React.createElement.

import React from 'react'

// The next "*" that is not half of a "**". Italic must not swallow a bold mark.
function findItalicEnd(text, from) {
    let index = from
    while (index < text.length) {
        if (text[index] !== '*') {
            index += 1
            continue
        }
        if (text[index + 1] === '*') {
            index += 2
            continue
        }
        return index
    }
    return -1
}

// One line of text, with bold and italic lifted out. The rest stays as text.
function parseInline(text, keyPrefix) {
    const nodes = []
    let plain = ''
    let index = 0
    let mark = 0

    const flush = () => {
        if (!plain) return
        nodes.push(plain)
        plain = ''
    }

    while (index < text.length) {
        if (text.startsWith('**', index)) {
            const close = text.indexOf('**', index + 2)
            if (close > index + 2) {
                flush()
                nodes.push(<strong key={`${keyPrefix}-b-${mark}`}>{text.slice(index + 2, close)}</strong>)
                mark += 1
                index = close + 2
                continue
            }
        } else if (text[index] === '*') {
            const close = findItalicEnd(text, index + 1)
            if (close !== -1 && close > index + 1) {
                flush()
                nodes.push(<em key={`${keyPrefix}-i-${mark}`}>{text.slice(index + 1, close)}</em>)
                mark += 1
                index = close + 1
                continue
            }
        }
        plain += text[index]
        index += 1
    }

    flush()
    if (nodes.length === 0) return text
    return nodes
}

// An array of elements, or null when there is nothing to show.
export function renderCardBody(text) {
    if (typeof text !== 'string' || text === '') return null

    const lines = text.replace(/\r\n?/g, '\n').split('\n')
    const blocks = []
    let list = null
    let key = 0

    const closeList = () => {
        if (!list) return
        const items = list
        list = null
        blocks.push(
            <ul key={`ul-${key}`}>
                {items.map((item, index) => (
                    <li key={`${key}-${index}`}>{parseInline(item, `li-${key}-${index}`)}</li>
                ))}
            </ul>,
        )
        key += 1
    }

    for (const line of lines) {
        if (line.startsWith('- ')) {
            if (!list) list = []
            list.push(line.slice(2))
            continue
        }
        closeList()
        blocks.push(<p key={`p-${key}`}>{parseInline(line, `p-${key}`)}</p>)
        key += 1
    }

    closeList()
    return blocks
}
