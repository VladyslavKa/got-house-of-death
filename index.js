const fetch = require('node-fetch');

const URL = 'https://anapioficeandfire.com/api/books';

function fetchToJson(url) {
    return fetch(url).then(response => response.json());
}

function* findHouseOfDeath(url) {
    const houses = {};
    const targetHouse = {
        deathCount: 0,
        url: new Set()
    };

    const { characters } = yield fetchToJson(url);
    const allCharacters = yield Promise.all(characters.map(characterUrl => fetchToJson(characterUrl)));

    allCharacters.forEach(item => {
        const { died, allegiances } = item;

        if (died) {
            allegiances.forEach(allegiance => {
                let houseDeathCount = houses[allegiance] || 0;

                Object.assign(houses, {
                    [allegiance]: houseDeathCount ? houseDeathCount += 1 : 1,
                });

                const baseParams = {
                    deathCount: houseDeathCount,
                };

                if (houseDeathCount > targetHouse.deathCount) {
                    Object.assign(targetHouse, baseParams, {
                        url: [allegiance],
                    });
                } else if (houseDeathCount === targetHouse.deathCount) {
                    Object.assign(targetHouse, baseParams, {
                        url: new Set([].concat(Array.from(targetHouse.url), [allegiance])),
                    });
                }
            });
        }
    });

    const result = {};

    for(let url of Array.from(targetHouse.url)) {
        const { name: houseName } = yield fetchToJson(url);
        Object.assign(result, {
            [houseName]: targetHouse.deathCount
        });
    }

    return result;
}

function* findHouseOfDeathInAllBooks(url) {
    const allBooks = yield fetchToJson(url);
    const stats = {};

    for (let book of allBooks) {
        const deathsInHouse = yield* findHouseOfDeath(book.url);

        Object.assign(stats, {
            [book.name]: deathsInHouse,
        })
    }

    return stats;
}

function execute(generator, yieldValue) {

    let next = generator.next(yieldValue);

    if (!next.done) {
        next.value.then(
            result => execute(generator, result),
            err => generator.throw(err)
        );
    } else {
        // обработаем результат return из генератора
        // обычно здесь вызов callback или что-то в этом духе
        console.log(next.value);
    }

}

execute(findHouseOfDeathInAllBooks(URL));
// execute(findHouseOfDeath('https://anapioficeandfire.com/api/books/7'));