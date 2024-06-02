import puppeteer from "puppeteer";
import { logger } from "./logger";
import { getCompanies } from "./input";
import { cnpjFormatter } from "./cnpj";

declare var document: any;

async function main()
{
    const companies = await getCompanies()
    const browser = await puppeteer.launch({
        headless: false,
        ignoreDefaultArgs: ['--enable-automation'],
        args: ['--disable-blink-features=AutomationControlled'],
      })
    const page = await browser.newPage()
      
    await page.setViewport({ width: 1920, height: 1080 })
    await page.goto('https://det.sit.trabalho.gov.br/login')
    const loginButton = await page.waitForSelector('#botao')
    await loginButton?.click()

    const certButton = await page.waitForSelector('#login-certificate')
    await new Promise(r => setTimeout(r, 1230))
    await certButton?.click()

    logger.info('Aguardando usuário selecionar certificado digital.')
    
    for (var i = 0; i < companies.length; i++) {
        if (i != 0) {
            await page.goto('https://det.sit.trabalho.gov.br/servicos')
        }

        const company = companies[i]
        const name = Object.values(company)[0]
        const changeProfileButton = await page.waitForSelector('#content > app-servicos > app-info-empregador > div > div:nth-child(2) > div > strong > button')
        await new Promise(r => setTimeout(r, 1000))
        changeProfileButton?.click()

        await page.waitForSelector('ng-select')
        await page.evaluate(() => {
            var clickEvent = new Event('mousedown', { bubbles: true, cancelable: true })
            document.querySelector('ng-select > div').dispatchEvent(clickEvent)
        })
        const procuradorButton = await page.waitForSelector(`.ng-option:last-child`)
        await procuradorButton?.click()

        const cnpj = cnpjFormatter(company.CNPJ)
        logger.info(`Logando na empresa ${name} com CNPJ: ${cnpj}`)
        await page.$eval('body > modal-container > div > div > app-modal-perfil > div.modal-body > form > div:nth-child(2) > div > br-input > div > div > input', (input, value) => {
            input.value = value;
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
        }, cnpj)

        await page.click('body > modal-container > div > div > app-modal-perfil > div.modal-body > form > div.row.barra-botoes > div > button.br-button.is-primary')
        await page.waitForFunction(() => {
            return !document.body.classList.contains('modal-open')
                || !!document.querySelector('.br-message.is-danger')
                || document.querySelector('.br-input.is-invalid')
        })
        if (await page.$('.br-message.is-danger') || await page.$('.br-input.is-invalid')) {
            logger.error(`Login falhou: Empresa ${name} com CNPJ: ${cnpj}`)
            continue;
        }
        logger.info(`Logado na empresa ${company['EMPRESA']}: ${cnpj}`)

        await page.goto('https://det.sit.trabalho.gov.br/cadastro', {waitUntil: 'networkidle0'})

        const hasContactRegistered = !(await page.$('#content > app-cadastro > br-title > br-alert-messages > aside > div.br-message.is-warning'))
        logger.info(`Tem contatos registrados: ${hasContactRegistered ? 'Sim' : 'Não'}`)
        
        if (!hasContactRegistered) {
            logger.info('Registrando palavra chave.')

            const keyworkInput = await page.waitForSelector('#content > app-cadastro > form > div:nth-child(1) > div > br-input > div > div > input')
            await keyworkInput?.type('CLEOSELMA')

            await page.click('#content > app-cadastro > form > div.br-table > div > span > a')
            
            logger.info('Registrando contato.')
            const nameInput = await page.waitForSelector('body > modal-container > div > div > app-contato-cadastro > div.modal-body > form > div > div:nth-child(1) > br-input > div > div > input')
            const emailInput = await page.$('body > modal-container > div > div > app-contato-cadastro > div.modal-body > form > div > div:nth-child(2) > br-input > div > div > input')
            const phoneInput = await page.$('body > modal-container > div > div > app-contato-cadastro > div.modal-body > form > div > div:nth-child(3) > br-input > div > div > input')

            await nameInput?.type('CLEOSELMA')
            await emailInput?.type('pessoal@cleodoncontabilidade.com.br')
            await phoneInput?.type('(82) 99626-4298')
            logger.info('Salvando contato.')
            await page.click('body > modal-container > div > div > app-contato-cadastro > div.modal-footer > button.br-button.is-primary')
            await page.waitForFunction(() => !document.body.classList.contains('modal-open'))
            logger.info('Salvando cadastro.')
            await new Promise(r => setTimeout(r, 500))
            await page.click('#content > app-cadastro > form > div.row.barra-botoes > div > button')
            await page.waitForSelector('#content > app-cadastro > br-title > br-alert-messages > aside > div')
            logger.info('Cadastro finalizado')
        }

        logger.info('Salvando print da caixa postal')
        await page.goto('https://det.sit.trabalho.gov.br/caixapostal')
        await page.waitForSelector('.tabela_mensagens')
        await page.waitForFunction(() => {
            const element = document.querySelector('.br-load.is-loading');
            return !element;
        }, { timeout: 30000 })
        await page.screenshot({
            path: `output/${name}-caixa-postal.png`
        })

        logger.info('Salvando print das notificações')
        await page.goto('https://det.sit.trabalho.gov.br/notificacao')
        await page.waitForSelector('br-title')
        await page.waitForFunction(() => {
            const element = document.querySelector('.br-load.is-loading');
            return !element;
        }, { timeout: 30000 })
        await page.screenshot({
            path: `output/${name}-notificacoes.png`
        })
        logger.info(`Empresa ${name} finalizada`)
    }
    
    await browser.close()
}

main()