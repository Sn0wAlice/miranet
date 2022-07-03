const { createInterface, clearLine, moveCursor } = require("readline")
const interface = createInterface(process.stdin, process.stdout)
const fetch = require('node-fetch')
const fs = require('fs')

if(process.stdout.columns < 127) {
    throw new Error('Terminal width must be at least 127 characters')
}

let hostname = "https://www.amelia.lu"
let path = ""

let pageClean = ""
let submitURL = ""
let submitType = ""
let interval = ""
/**
 * Inputs value: 
 * {
 *      "name": "inputname",
 *      "value": "inputvalue",
 *      "type": "text/hidden",
 *      "size": "Value",
 * }
 */
let inputsList = []
let myCookies = []
//console.log(vertical)

// Navigation
function init() {
    process.stdout.write("\x1Bc");
    console.log(Array(process.stdout.rows + 1).join("\n"));
}

function output(content, clear) {
    clearLine(process.stdout);

    if(clear) {
        console.clear()
    }

    //move cursor to the beginning of the line
    moveCursor(process.stdout, -5, 0);

    console.log(content);
    interface.prompt(true);
}

function input() {
    return new Promise(resolve => {
        let question = "Action > ";
        interface.question(question, answer => {
            moveCursor(process.stdout, 0, -1);
            clearLine(process.stdout);
            resolve(answer);
        });
    })
}

async function *inputs() {
    while (true) {
        yield await input();
    }
}

async function main() {
    init();
    output("------ Welcome to miranet ------", true);
    output('@ Please enter a command:');
    output('@ type "help" for help');
    for await (let input of inputs()) {
        input = input.split(' ')

        /*
        if(input == "test"){
            output(createPageRender(page), true)
        }
        */

        if(input[0] == "set"){
            action_set(input)
        } else if(input[0] == "get"){
            await action_get(input)
        } else if(input[0] == "go"){
            if(input.length == 2){
                path = input[1]
                if(!path.startsWith('/')){
                    path = '/' + path
                }
                action_set(["set", "path", path])
                await action_get(["get"])
            }
        } else if(input[0].startsWith('i:')){
            userInput(input)
        } else if(input[0] == "submit"){
            userSubmit(input)
        } else if(input[0] == "send"){
            action_send(input)
        }else if(input[0] == "help"){
            pageClean = fs.readFileSync('./utils/help.md', 'utf8')
            action_get(["get", "reload"])
        }

    }
}

// Get the content
function action_set(input){
    if(input.length == 3){
        if(input[1] == 'hostname'){
            hostname = input[2]
            if(!hostname.startsWith('http://') && !hostname.startsWith('https://')){
                hostname = 'https://' + hostname
            }
            if(hostname.endsWith('/')){
                hostname = hostname.slice(0, -1)
            }
            output('Hostname set to '+hostname)
        } else if(input[1] == 'path'){
            path = input[2]
            if(!path.startsWith('/')){
                path = '/' + path
            }
            output('Path set to '+path)
        }
    }
}

async function action_get(input){

    //make const
    let clean = false

    if(input.length == 1){
        if(hostname != ""){
            output(createPageRender(await getPageContent(hostname+path)), clean)
        } else {
            output('Please set a hostname first')
        }
    } else if(input.length == 2){
        if(input[1] == 'reload'){
            output(createPageRender(pageClean, true), clean)
        } else if(input[1] == 'refresh'){
            output(createPageRender(await getPageContent(hostname+path), true), clean)
        }
    } else if(input.length == 3){
        if(input[1] == 'custom'){
            output(createPageRender(await getPageContent(input[2]), true), clean)
        }
    }
}

async function getPageContent(url){
    try {
        let req = await fetch(url, {
            method: 'GET',
            headers: {
                "user-agent": "miranet",
                "Cookie": cookieStringGenerator()
            }
        })
        return await req.text()
    } catch (error) {
        return "Error, website not found"
    }
}

async function action_send(args){
    //send auto submit form assuming the form contain only one input
    if(inputsList.length == 1){
        inputsList[0].value = args.slice(1).join(' ')
        userSubmit()
    }
}

// Page result

const pageMaxWidth = 127
function createPageRender(pageContent, custom) {
    const pageMinHeith = process.stdout.rows - 2
    if(!custom){
        try {
            clearInterval(interval)
            inputsList = []
        } catch (error) {}
    }
    let pageRender = []
    pageClean = pageContent
    pageRender.push(generateHeader(returnTitle(pageContent)))
    pageContent = pageContent.split('\n')

    if(pageClean.includes('## redirect:')){
        //redirect the user
        console.log("Redirecting...")
        let redirect = pageClean.split('## redirect:')[1].split('\n')[0]
        action_set(['set', 'path', redirect])
        action_get(['get'])
        return
    }
    
    for(let i = 0; i < pageContent.length; i++) {
        //console.log(`Working on line ${i}: ${pageContent[i]}`)

        if(pageContent[i].startsWith('#') || pageContent[i] == "─".repeat(pageMaxWidth)|| pageContent[i] == "─".repeat(pageMaxWidth-2)) {

            pageContent[i] = ""

        } else {
            let line = pageContent[i].split('')
            if(line.length > pageMaxWidth) {
                console.log(`Line ${i} is too long`)
                line = line.slice(0, pageMaxWidth)
            }
            let lineRender = generateNewLine(pageMaxWidth)
            for(let j = 0; j<line.length; j++){
                lineRender[j+1] = line[j]
            }
            pageRender.push(lineRender)
            
        }
    }

    // Generate the footer
    if(pageRender.length < pageMinHeith) {
        for(let i = pageRender.length; i < pageMinHeith; i++) {
            pageRender.push(generateNewLine(pageMaxWidth))
        }
    }
    pageRender.push(generateFooter())

    /**
     * Check custom function 
     * 
     * ## reload: X => reload page each X seconds
     * ## submit:URL => submit form to URL
     */
    if(pageClean.includes('## reload:')) {
        try {
            let reload = pageClean.split('## reload:')[1].split('\n')[0]
            if(reload.includes(' ')) {
                reload = Number(reload.split(' ')[1])
            }
            if(reload != NaN) {
                console.log(`Reloading page every ${reload} seconds`)
                try {
                    clearInterval(interval)
                    interval = null
                } catch (error) {}
                interval = setInterval(() => {
                    action_get(['get', "refresh"])
                }, reload*1000)
            } else {
                console.log("Invalid reload value")
            }
        } catch (error) {}
    }
    if(pageClean.includes('## submit:')) {
        try {
            submitURL = pageClean.split('## submit:')[1].split('\n')[0].split(':')[0]
            submitType = pageClean.split('## submit:')[1].split('\n')[0].split(':')[1]
            console.log(`Submitting form to ${submitURL} in: ${submitType}`)
        } catch (error) {}
    }


    //show page
    let page = []
    for(let i = 0; i < pageRender.length; i++) {
        page.push(interpretingMD(checkLineLength(getInput(pageRender[i].join('')))))
    }
    return page.join('\n')
}


// Function for line rendering
function generateNewLine(length) {
    let arr = ['│']
    arr = arr.concat(generateEmptyArray(length-2))
    arr.push('│')
    return arr
}

function generateHeader(title) {
    let header = []
    header.push('┌ '+title+' ')
    header.push('─'.repeat(pageMaxWidth - 2 - (title.length+2)))
    header.push('┐')
    return header
}

function generateFooter(){
    let footer = []
    footer.push('└')
    footer.push('─'.repeat(pageMaxWidth - 2))
    footer.push('┘')
    return footer
}

function generateEmptyArray(length) {
    let arr = []
    for(let i = 0; i < length; i++) {
        arr.push(' ')
    }
    return arr
}

// Function for page interpreting
function returnTitle(pageContent){
    //return the first line who starts with '# '
    let lines = pageContent.split('\n')
    for(let i = 0; i < lines.length; i++) {
        if(lines[i].startsWith('# ')) {
            return lines[i].substring(2)
        }
    } 
    return 'No title'
}

function getInput(lineContent){
    let tmp = lineContent.split('__input:')

    for(let i = 1; i < tmp.length; i++) {
        let data = tmp[i].split('__')[0]
        tmp[i] = tmp[i].replace(tmp[i].split('__')[0]+"__", inputManager(data))
    }
    
    return tmp.join('')
}

function inputManager(input){
    //input: name:type:Length
    let inputSplit = input.split(':')
    let inputName = inputSplit[0]
    let inputType = inputSplit[1]
    let inputLength = Number(inputSplit[2]) ? Number(inputSplit[2])+2 : 2

    //find the input in the database
    let i = inputsList.find(x => x.name == inputName)
    if(i){
        //check if value is set
        if(i.value != ""){
            if(inputType == "text"){
                try {
                    return i.value+(" ".repeat(inputLength-(i.value.length)))
                } catch (error) {
                    return i.value
                }
            } else if(inputType == "hidden") {
                try {
                    return '-'.repeat(i.value.length)+(" ".repeat(inputLength-(i.value.length)))
                } catch (error) {
                    return '-'.repeat(i.value.length)
                }
            }
        } else {
            try {
                return "i:"+inputName+(" ".repeat(inputLength-(inputName.length+2)))
            } catch (error) {
                return "i:"+inputName
            }
        }
    } else {
        //create new input
        inputsList.push({
            name: inputName,
            type: inputType,
            length: inputLength,
            value: ''
        })
        try {
            return "i:"+inputName+(" ".repeat(inputLength-(inputName.length+2)))
        } catch (error) {
            return "i:"+inputName
        }
    }
}

function userInput(args){
    let inputName = args[0].split(':')[1]
    if(inputName == "reset"){
        //reset all inputs
        for(let i = 0; i < inputsList.length; i++){
            inputsList[i].value = ""
        }
        interval = ""
        action_get(['get', "reload"])
        return
    }
    //check if input is in the database
    let i = inputsList.find(x => x.name == inputName)
    if(i){
        i.value = args.slice(1).join(' ')
    }
    action_get(['get', "reload"])
}

async function userSubmit(args){
    //check the submit url is valid
    if(submitURL != ""){
        //check all the inputs are set
        let check = inputsList.find(x => x.value == "")
        if(!check){
            //submit the form

            if(submitType == "GET"){
                // in the URL, replace the inputs with the values
                let url = submitURL
                for(let i = 0; i < inputsList.length; i++) {
                    if(i==0){
                        url += "?"+inputsList[i].name+"="+inputsList[i].value
                    } else {
                        url += "&"+inputsList[i].name+"="+inputsList[i].value
                    }
                }
                action_get(['get', "custom", url])
            } else if(submitType == "POST"){
                // body is parsed as a JSON object
                let body = {}
                for(let i = 0; i < inputsList.length; i++) {
                    body[inputsList[i].name] = inputsList[i].value
                }

                // fetch
                try {
                    let req = await fetch(hostname + submitURL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            "user-agent": "miranet",
                            "Cookie": cookieStringGenerator()
                        },
                        body: JSON.stringify(body)
                    })
    
                    //check if server ask us for setting cookies
                    if(req.headers.get('set-cookie')){
                        //set the cookies
                        let cookies = req.headers.get('set-cookie')
                        cookies = cookies.split(';')
                        for(let i = 0; i < cookies.length; i++) {
                            let cookieName = cookies[i].split('=')[0]
                            let cookieValue = cookies[i].split('=')[1]
    
                            //check if cookie is already set
                            let c = myCookies.find(x => x.name == cookieName)
                            if(c){
                                c.value = cookieValue
                            } else {
                                //add to the cookie database
                                myCookies.push({
                                    name: cookieName,
                                    value: cookieValue
                                })
                            }
                        }
                    }
    
                    console.log(myCookies)
    
                    createPageRender(await req.text())
                } catch (error) {
                    createPageRender("Error, website not found")
                }
                
            }

        } else {
            console.log("Missing input: "+check.name)
        }
    } else {
        output("No submit url set, please contact the admin of the page")
    }
}

// Utils functions

function checkLineLength(lineContent){

    //we need to clean the input
    let cleanLine = mdCleaner(lineContent)

    let tmplineContent = cleanLine.split('')

    if(tmplineContent.length < pageMaxWidth) {
        tmplineContent.pop()
        
        // remove the last character of lineContent
        lineContent = lineContent.substring(0, lineContent.length-1)

        while(tmplineContent.length < pageMaxWidth-1) {
            tmplineContent.push(' ')
            lineContent = lineContent + ' '
        }
        lineContent = lineContent + '│'
    }

    return lineContent
}

function mdCleaner(lineContent){
    //clean the markdown content
    lineContent = lineContent.replace(/\*\*(.*?)\*\*/g, '$1')

    lineContent = lineContent.replace(/_r(.*?)__/g, '$1')
    lineContent = lineContent.replace(/_g(.*?)__/g, '$1')
    lineContent = lineContent.replace(/_y(.*?)__/g, '$1')
    lineContent = lineContent.replace(/_b(.*?)__/g, '$1')
    lineContent = lineContent.replace(/_m(.*?)__/g, '$1')
    lineContent = lineContent.replace(/_c(.*?)__/g, '$1')
    return lineContent
}

function interpretingMD(lineContent){
    lineContent = lineContent.replace(/\*\*(.*?)\*\*/g, '\x1b[1m$1\x1b[0m')

    lineContent = lineContent.replace(/_r(.*?)__/g, '\x1b[31m$1\x1b[0m')
    lineContent = lineContent.replace(/_g(.*?)__/g, '\x1b[32m$1\x1b[0m')
    lineContent = lineContent.replace(/_y(.*?)__/g, '\x1b[33m$1\x1b[0m')
    lineContent = lineContent.replace(/_b(.*?)__/g, '\x1b[34m$1\x1b[0m')
    lineContent = lineContent.replace(/_m(.*?)__/g, '\x1b[35m$1\x1b[0m')
    lineContent = lineContent.replace(/_c(.*?)__/g, '\x1b[36m$1\x1b[0m')

    return lineContent
}

function cookieStringGenerator(){
    //generate the cookie string
    let cookieString = ""
    for(let i = 0; i < myCookies.length; i++) {
        if(i==0){
            cookieString += myCookies[i].name+"="+myCookies[i].value
        } else {
            cookieString += ";"+myCookies[i].name+"="+myCookies[i].value
        }
    }
    return cookieString
}

// Launch the main function
main()