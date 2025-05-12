export function cnpjFormatter(cnpj: string)
{
    if (cnpj.length === 11) {
        return cnpj.slice(0, 3) + '.' + cnpj.slice(3, 6) + '.' + cnpj.slice(6, 9) + '-' + cnpj.slice(9);
    }

    return cnpj.slice(0, 2) + '.' + cnpj.slice(2, 5) + '.' + cnpj.slice(5, 8) + '/' + cnpj.slice(8, 12) + '-' + cnpj.slice(12)
}