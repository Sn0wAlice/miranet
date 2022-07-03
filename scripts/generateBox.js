/**
 * Generator for a box. Use for web development.
 */

function createBox(width, height, title) {
    let box = ''
    let pass = true
    if(title == undefined || title == '') {
        pass = false
    }

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if(i === 0 && j === 0) {
                box += '┌'
            } else if(i === 0 && j === width - 1) {
                box += '┐'
            } else if(i === height - 1 && j === 0) {
                box += '└'
            } else if(i === height - 1 && j === width - 1) {
                box += '┘'
            } else if(i === 0 || i === height - 1) {
                if(i == 0 && pass) {
                    if(j > 3){
                        if(title.length+4 < j) {
                            box += '─'
                        } else if(title.length+4 == j) {
                            box += ' ──'
                        } else {
                            box += title[j-4]
                        }
                    } else if(j === 3) {
                        box += ' '
                    }
                } else {
                    box += '─'
                }
            } else if(j === 0 || j === width - 1) {
                box += '│'
            } else {
                box += ' '
            }
        }
        box += '\n'
    }
    return box
}

console.log(createBox(30, 3, 'Username'))
console.log(createBox(30, 3, 'Password'))
