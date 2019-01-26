import { launch } from 'puppeteer'
import { argv } from 'yargs'

async function main() {
  const { u, p, h } = argv
  if (!u || !p) {
    return console.error('Missing user name or password (-u example username, -p example password)')
  }
  const browser = await launch({ headless: !!h, devtools: false })
  const page = await browser.newPage()
  console.log('Opening https://moj.tvz.hr/ ...')
  await page.goto('https://moj.tvz.hr/')
  console.log('Logging in...')
  await page.evaluate(
    (username, password) => {
      // @ts-ignore
      document.querySelector('input[name="login"]')!.value = username
      // @ts-ignore
      document.querySelector('input[name="passwd"]')!.value = password
      // @ts-ignore
      document.querySelector('button[type="submit"]')!.click()
    }, u, p)

  await page.waitForNavigation({
    waitUntil: 'domcontentloaded',
  })
  console.log('Filling out the forms...')
  const numOfButtons = await page.evaluate(() => {
    const buttons: NodeListOf<HTMLButtonElement> = document.querySelectorAll('button.btn.btn-danger')
    if (!buttons) {
      return new Error('No button found')
    }

    return buttons.length
  })

  for (let i = 0; i < numOfButtons; i++) {
    await page.evaluate(() => {
      const button = document.querySelector('button.btn.btn-danger') as HTMLButtonElement
      if (!button) {
        return
      }
      button.click()
    })
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' })

    const pAndV = await page.evaluate(() => {
      let found = false
      const buttons = document.querySelectorAll('button')
      for (let j = 0; j < buttons.length; j++) {
        if (buttons[j].innerText === 'predavanja i vježbe') {
          found = true
          break
        }
      }
      return found
    })
    if (pAndV) {
      await page.waitForNavigation({ waitUntil: 'networkidle0' })
    } else {
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button')
        for (let j = 0; j < buttons.length; j++) {
          if (buttons[j].innerText === 'predavanja') {
            buttons[j].click()
            break
          }
        }
      })
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' })

      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button')
        for (let j = 0; j < buttons.length; j++) {
          if (buttons[j].innerText === 'vježbe') {
            buttons[j].click()
            break
          }
        }
      })
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' })
    }
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>
      inputs.forEach(inp => {
        if (inp.value === '0') {
          inp.click()
        }
      })
      const buttons = document.querySelectorAll('button.btn.btn-success') as NodeListOf<HTMLButtonElement>
      buttons.forEach(btn => {
        if (btn.innerText === 'Predaj anketu') {
          btn.click()
        }
      })
    })

    await page.waitForNavigation({ waitUntil: 'domcontentloaded' })
  }
  console.log('Done closing...')
  await page.close()
  await browser.close()
}

main().catch(console.error)
