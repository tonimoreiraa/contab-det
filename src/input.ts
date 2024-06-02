import { createReadStream } from 'fs'
import csvParser from 'csv-parser'

interface DataStyle {
    EMPRESA: string
    CNPJ: string
}

export function getCompanies()
{
    const result: DataStyle[] = []
    return new Promise<DataStyle[]>(resolve => {
        createReadStream('./input.csv')
            .pipe(csvParser({separator: ';'}))
            .on('data', (data: DataStyle) => result.push(data))
            .on('end', () => resolve(result))
    })
}