var async = require('async');

exports.startup = function(context, done) {
  console.log('Starting');
  
  async.series([
    function(_done) { delete_existing_data(context, _done); },
    function(_done) { populate_tables(context, _done); }
  ], done);
};

function delete_existing_data(context, callback) {
  async.parallel([
    function(done) { truncate_table(context, 'movies', done); },
    function(done) { truncate_table(context, 'intIdMovies', done); }
  ], callback);
}

function truncate_table(context, tableName, callback) {
  context.mssql.query('truncate table ' + tableName,
    {
      success: function(res) {
        callback();
      },
      error: function(err) {
        console.log('Err: ' + err);
        callback(err);
      }
    });
}

function populate_tables(context, callback) {
  async.parallel([
    function(done) {
      console.log('Populating Movies table.');
      var moviesTable = context.tables.getTable('movies');
      populate_movies_table(moviesTable, true, done);
    },
    function(done) {
      console.log('Populating IntIdMovies table.');
      var intIdMoviesTable = context.tables.getTable('intIdMovies');
      populate_movies_table(intIdMoviesTable, false, done);
    }
  ], callback);
}

function pad_left(num, length){
    num = num.toString();
    while (num.length < length){
        num = "0" + num;
    }
    return num;
};

function populate_movies_table(table, stringId, callback) {
  var i = 0;
  async.eachSeries(movies, function(movie, _doneForEach) {
    var obj =
    {
      title:             movie.title,
      duration:          movie.duration,
      mpaaRating:        movie.mpaaRating,
      releaseDate:       movie.releaseDate,
      bestPictureWinner: movie.bestPictureWinner,
      year:              movie.year
    };
    if (stringId) {
      obj.id = 'Movie ' + pad_left(i, 3);
    }
    i++;
    table.insert( obj,
                  {
                    success: function(res) {
                      _doneForEach();
                    },
                    error: function(err) {
                      console.log('Err: ' + err);
                      _doneForEach(err);
                    }
                  });
  }, callback);
}

var movies =
[
  {
    "title": "The Shawshank Redemption",
    "duration": 142,
    "mpaaRating": "R",
    "releaseDate": "1994-10-14T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1994
  },
  {
    "title": "The Godfather",
    "duration": 175,
    "mpaaRating": "R",
    "releaseDate": "1972-03-24T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1972
  },
  {
    "title": "The Godfather: Part II",
    "duration": 200,
    "mpaaRating": "R",
    "releaseDate": "1974-12-20T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1974
  },
  {
    "title": "Pulp Fiction",
    "duration": 168,
    "mpaaRating": "R",
    "releaseDate": "1994-10-14T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1994
  },
  {
    "title": "The Good, the Bad and the Ugly",
    "duration": 161,
    "mpaaRating": null,
    "releaseDate": "1967-12-29T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1966
  },
  {
    "title": "12 Angry Men",
    "duration": 96,
    "mpaaRating": null,
    "releaseDate": "1957-04-10T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1957
  },
  {
    "title": "The Dark Knight",
    "duration": 152,
    "mpaaRating": "PG-13",
    "releaseDate": "2008-07-18T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2008
  },
  {
    "title": "Schindler's List",
    "duration": 195,
    "mpaaRating": "R",
    "releaseDate": "1993-12-15T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1993
  },
  {
    "title": "The Lord of the Rings: The Return of the King",
    "duration": 201,
    "mpaaRating": "PG-13",
    "releaseDate": "2003-12-17T00:00:00Z",
    "bestPictureWinner": true,
    "year": 2003
  },
  {
    "title": "Fight Club",
    "duration": 139,
    "mpaaRating": "R",
    "releaseDate": "1999-10-15T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1999
  },
  {
    "title": "Star Wars: Episode V - The Empire Strikes Back",
    "duration": 127,
    "mpaaRating": "PG",
    "releaseDate": "1980-05-21T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1980
  },
  {
    "title": "One Flew Over the Cuckoo's Nest",
    "duration": 133,
    "mpaaRating": null,
    "releaseDate": "1975-11-21T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1975
  },
  {
    "title": "The Lord of the Rings: The Fellowship of the Ring",
    "duration": 178,
    "mpaaRating": "PG-13",
    "releaseDate": "2001-12-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2001
  },
  {
    "title": "Inception",
    "duration": 148,
    "mpaaRating": "PG-13",
    "releaseDate": "2010-07-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2010
  },
  {
    "title": "Goodfellas",
    "duration": 146,
    "mpaaRating": "R",
    "releaseDate": "1990-09-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1990
  },
  {
    "title": "Star Wars",
    "duration": 121,
    "mpaaRating": "PG",
    "releaseDate": "1977-05-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1977
  },
  {
    "title": "Seven Samurai",
    "duration": 141,
    "mpaaRating": null,
    "releaseDate": "1956-11-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1954
  },
  {
    "title": "The Matrix",
    "duration": 136,
    "mpaaRating": "R",
    "releaseDate": "1999-03-31T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1999
  },
  {
    "title": "Forrest Gump",
    "duration": 142,
    "mpaaRating": "PG-13",
    "releaseDate": "1994-07-06T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1994
  },
  {
    "title": "City of God",
    "duration": 130,
    "mpaaRating": "R",
    "releaseDate": "2002-01-01T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2002
  },
  {
    "title": "The Lord of the Rings: The Two Towers",
    "duration": 179,
    "mpaaRating": "PG-13",
    "releaseDate": "2002-12-18T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2002
  },
  {
    "title": "Once Upon a Time in the West",
    "duration": 175,
    "mpaaRating": "PG-13",
    "releaseDate": "1968-12-21T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1968
  },
  {
    "title": "Se7en",
    "duration": 127,
    "mpaaRating": "R",
    "releaseDate": "1995-09-22T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1995
  },
  {
    "title": "The Silence of the Lambs",
    "duration": 118,
    "mpaaRating": "R",
    "releaseDate": "1991-02-14T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1991
  },
  {
    "title": "Casablanca",
    "duration": 102,
    "mpaaRating": "PG",
    "releaseDate": "1943-01-23T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1942
  },
  {
    "title": "The Usual Suspects",
    "duration": 106,
    "mpaaRating": "R",
    "releaseDate": "1995-08-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1995
  },
  {
    "title": "Raiders of the Lost Ark",
    "duration": 115,
    "mpaaRating": "PG",
    "releaseDate": "1981-06-12T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1981
  },
  {
    "title": "Rear Window",
    "duration": 112,
    "mpaaRating": "PG",
    "releaseDate": "1955-01-13T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1954
  },
  {
    "title": "Psycho",
    "duration": 109,
    "mpaaRating": "TV-14",
    "releaseDate": "1960-09-08T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1960
  },
  {
    "title": "It's a Wonderful Life",
    "duration": 130,
    "mpaaRating": "PG",
    "releaseDate": "1947-01-06T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1946
  },
  {
    "title": "Léon: The Professional",
    "duration": 110,
    "mpaaRating": "R",
    "releaseDate": "1994-11-18T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1994
  },
  {
    "title": "Sunset Blvd.",
    "duration": 110,
    "mpaaRating": null,
    "releaseDate": "1950-08-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1950
  },
  {
    "title": "Memento",
    "duration": 113,
    "mpaaRating": "R",
    "releaseDate": "2000-10-11T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2000
  },
  {
    "title": "The Dark Knight Rises",
    "duration": 165,
    "mpaaRating": "PG-13",
    "releaseDate": "2012-07-20T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2012
  },
  {
    "title": "American History X",
    "duration": 119,
    "mpaaRating": "R",
    "releaseDate": "1999-02-12T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1998
  },
  {
    "title": "Apocalypse Now",
    "duration": 153,
    "mpaaRating": "R",
    "releaseDate": "1979-08-15T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1979
  },
  {
    "title": "Terminator 2: Judgment Day",
    "duration": 152,
    "mpaaRating": "R",
    "releaseDate": "1991-07-03T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1991
  },
  {
    "title": "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb",
    "duration": 95,
    "mpaaRating": "PG",
    "releaseDate": "1964-01-29T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1964
  },
  {
    "title": "Saving Private Ryan",
    "duration": 169,
    "mpaaRating": "R",
    "releaseDate": "1998-07-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1998
  },
  {
    "title": "Alien",
    "duration": 117,
    "mpaaRating": "TV-14",
    "releaseDate": "1979-05-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1979
  },
  {
    "title": "North by Northwest",
    "duration": 136,
    "mpaaRating": null,
    "releaseDate": "1959-09-26T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1959
  },
  {
    "title": "City Lights",
    "duration": 87,
    "mpaaRating": null,
    "releaseDate": "1931-03-07T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1931
  },
  {
    "title": "Spirited Away",
    "duration": 125,
    "mpaaRating": "PG",
    "releaseDate": "2001-07-20T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2001
  },
  {
    "title": "Citizen Kane",
    "duration": 119,
    "mpaaRating": "PG",
    "releaseDate": "1941-09-05T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1941
  },
  {
    "title": "Modern Times",
    "duration": 87,
    "mpaaRating": null,
    "releaseDate": "1936-02-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1936
  },
  {
    "title": "The Shining",
    "duration": 142,
    "mpaaRating": "R",
    "releaseDate": "1980-05-23T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1980
  },
  {
    "title": "Vertigo",
    "duration": 129,
    "mpaaRating": null,
    "releaseDate": "1958-07-21T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1958
  },
  {
    "title": "Back to the Future",
    "duration": 116,
    "mpaaRating": "PG",
    "releaseDate": "1985-07-03T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1985
  },
  {
    "title": "American Beauty",
    "duration": 122,
    "mpaaRating": "R",
    "releaseDate": "1999-10-01T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1999
  },
  {
    "title": "M",
    "duration": 117,
    "mpaaRating": null,
    "releaseDate": "1931-08-30T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1931
  },
  {
    "title": "The Pianist",
    "duration": 150,
    "mpaaRating": "R",
    "releaseDate": "2003-03-28T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2002
  },
  {
    "title": "The Departed",
    "duration": 151,
    "mpaaRating": "R",
    "releaseDate": "2006-10-06T00:00:00Z",
    "bestPictureWinner": true,
    "year": 2006
  },
  {
    "title": "Taxi Driver",
    "duration": 113,
    "mpaaRating": "R",
    "releaseDate": "1976-02-08T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1976
  },
  {
    "title": "Toy Story 3",
    "duration": 103,
    "mpaaRating": "G",
    "releaseDate": "2010-06-18T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2010
  },
  {
    "title": "Paths of Glory",
    "duration": 88,
    "mpaaRating": null,
    "releaseDate": "1957-10-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1957
  },
  {
    "title": "Life Is Beautiful",
    "duration": 118,
    "mpaaRating": "PG-13",
    "releaseDate": "1999-02-12T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1997
  },
  {
    "title": "Double Indemnity",
    "duration": 107,
    "mpaaRating": null,
    "releaseDate": "1944-04-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1944
  },
  {
    "title": "Aliens",
    "duration": 154,
    "mpaaRating": "R",
    "releaseDate": "1986-07-18T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1986
  },
  {
    "title": "WALL-E",
    "duration": 98,
    "mpaaRating": "G",
    "releaseDate": "2008-06-27T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2008
  },
  {
    "title": "The Lives of Others",
    "duration": 137,
    "mpaaRating": "R",
    "releaseDate": "2006-03-23T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2006
  },
  {
    "title": "A Clockwork Orange",
    "duration": 136,
    "mpaaRating": "R",
    "releaseDate": "1972-02-02T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1971
  },
  {
    "title": "Amélie",
    "duration": 122,
    "mpaaRating": "R",
    "releaseDate": "2001-04-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2001
  },
  {
    "title": "Gladiator",
    "duration": 155,
    "mpaaRating": "R",
    "releaseDate": "2000-05-05T00:00:00Z",
    "bestPictureWinner": true,
    "year": 2000
  },
  {
    "title": "The Green Mile",
    "duration": 189,
    "mpaaRating": "R",
    "releaseDate": "1999-12-10T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1999
  },
  {
    "title": "The Intouchables",
    "duration": 112,
    "mpaaRating": "R",
    "releaseDate": "2011-11-02T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2011
  },
  {
    "title": "Lawrence of Arabia",
    "duration": 227,
    "mpaaRating": null,
    "releaseDate": "1963-01-30T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1962
  },
  {
    "title": "To Kill a Mockingbird",
    "duration": 129,
    "mpaaRating": null,
    "releaseDate": "1963-03-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1962
  },
  {
    "title": "The Prestige",
    "duration": 130,
    "mpaaRating": "PG-13",
    "releaseDate": "2006-10-20T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2006
  },
  {
    "title": "The Great Dictator",
    "duration": 125,
    "mpaaRating": null,
    "releaseDate": "1941-03-07T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1940
  },
  {
    "title": "Reservoir Dogs",
    "duration": 99,
    "mpaaRating": "R",
    "releaseDate": "1992-10-23T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1992
  },
  {
    "title": "Das Boot",
    "duration": 149,
    "mpaaRating": "R",
    "releaseDate": "1982-02-10T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1981
  },
  {
    "title": "Requiem for a Dream",
    "duration": 102,
    "mpaaRating": "NC-17",
    "releaseDate": "2000-10-27T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2000
  },
  {
    "title": "The Third Man",
    "duration": 93,
    "mpaaRating": null,
    "releaseDate": "1949-08-31T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1949
  },
  {
    "title": "The Treasure of the Sierra Madre",
    "duration": 126,
    "mpaaRating": null,
    "releaseDate": "1948-01-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1948
  },
  {
    "title": "Eternal Sunshine of the Spotless Mind",
    "duration": 108,
    "mpaaRating": "R",
    "releaseDate": "2004-03-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2004
  },
  {
    "title": "Cinema Paradiso",
    "duration": 155,
    "mpaaRating": "PG",
    "releaseDate": "1990-02-23T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1988
  },
  {
    "title": "Once Upon a Time in America",
    "duration": 139,
    "mpaaRating": "R",
    "releaseDate": "1984-05-23T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1984
  },
  {
    "title": "Chinatown",
    "duration": 130,
    "mpaaRating": null,
    "releaseDate": "1974-06-20T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1974
  },
  {
    "title": "L.A. Confidential",
    "duration": 138,
    "mpaaRating": "R",
    "releaseDate": "1997-09-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1997
  },
  {
    "title": "The Lion King",
    "duration": 89,
    "mpaaRating": "G",
    "releaseDate": "1994-06-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1994
  },
  {
    "title": "Star Wars: Episode VI - Return of the Jedi",
    "duration": 134,
    "mpaaRating": "PG",
    "releaseDate": "1983-05-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1983
  },
  {
    "title": "Full Metal Jacket",
    "duration": 116,
    "mpaaRating": "R",
    "releaseDate": "1987-06-26T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1987
  },
  {
    "title": "Monty Python and the Holy Grail",
    "duration": 91,
    "mpaaRating": "PG",
    "releaseDate": "1975-05-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1975
  },
  {
    "title": "Braveheart",
    "duration": 177,
    "mpaaRating": "R",
    "releaseDate": "1995-05-24T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1995
  },
  {
    "title": "Singin' in the Rain",
    "duration": 103,
    "mpaaRating": null,
    "releaseDate": "1952-04-11T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1952
  },
  {
    "title": "Oldboy",
    "duration": 120,
    "mpaaRating": "R",
    "releaseDate": "2003-11-21T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2003
  },
  {
    "title": "Some Like It Hot",
    "duration": 120,
    "mpaaRating": null,
    "releaseDate": "1959-03-29T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1959
  },
  {
    "title": "Amadeus",
    "duration": 160,
    "mpaaRating": "PG",
    "releaseDate": "1984-09-19T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1984
  },
  {
    "title": "Metropolis",
    "duration": 114,
    "mpaaRating": null,
    "releaseDate": "1927-03-13T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1927
  },
  {
    "title": "Rashomon",
    "duration": 88,
    "mpaaRating": null,
    "releaseDate": "1951-12-26T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1950
  },
  {
    "title": "Bicycle Thieves",
    "duration": 93,
    "mpaaRating": null,
    "releaseDate": "1949-12-13T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1948
  },
  {
    "title": "2001: A Space Odyssey",
    "duration": 141,
    "mpaaRating": null,
    "releaseDate": "1968-04-06T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1968
  },
  {
    "title": "Unforgiven",
    "duration": 131,
    "mpaaRating": "R",
    "releaseDate": "1992-08-07T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1992
  },
  {
    "title": "All About Eve",
    "duration": 138,
    "mpaaRating": null,
    "releaseDate": "1951-01-15T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1950
  },
  {
    "title": "The Apartment",
    "duration": 125,
    "mpaaRating": null,
    "releaseDate": "1960-09-16T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1960
  },
  {
    "title": "Indiana Jones and the Last Crusade",
    "duration": 127,
    "mpaaRating": "PG",
    "releaseDate": "1989-05-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1989
  },
  {
    "title": "The Sting",
    "duration": 129,
    "mpaaRating": null,
    "releaseDate": "1974-01-10T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1973
  },
  {
    "title": "Raging Bull",
    "duration": 129,
    "mpaaRating": "R",
    "releaseDate": "1980-12-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1980
  },
  {
    "title": "The Bridge on the River Kwai",
    "duration": 161,
    "mpaaRating": null,
    "releaseDate": "1957-12-14T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1957
  },
  {
    "title": "Die Hard",
    "duration": 131,
    "mpaaRating": "R",
    "releaseDate": "1988-07-15T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1988
  },
  {
    "title": "Witness for the Prosecution",
    "duration": 116,
    "mpaaRating": null,
    "releaseDate": "1958-02-06T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1957
  },
  {
    "title": "Batman Begins",
    "duration": 140,
    "mpaaRating": "PG-13",
    "releaseDate": "2005-06-15T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2005
  },
  {
    "title": "A Separation",
    "duration": 123,
    "mpaaRating": "PG-13",
    "releaseDate": "2011-03-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2011
  },
  {
    "title": "Grave of the Fireflies",
    "duration": 89,
    "mpaaRating": null,
    "releaseDate": "1988-04-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1988
  },
  {
    "title": "Pan's Labyrinth",
    "duration": 118,
    "mpaaRating": "R",
    "releaseDate": "2007-01-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2006
  },
  {
    "title": "Downfall",
    "duration": 156,
    "mpaaRating": "R",
    "releaseDate": "2004-09-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2004
  },
  {
    "title": "Mr. Smith Goes to Washington",
    "duration": 129,
    "mpaaRating": null,
    "releaseDate": "1939-10-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1939
  },
  {
    "title": "Yojimbo",
    "duration": 75,
    "mpaaRating": "TV-MA",
    "releaseDate": "1961-09-13T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1961
  },
  {
    "title": "The Great Escape",
    "duration": 172,
    "mpaaRating": null,
    "releaseDate": "1963-07-04T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1963
  },
  {
    "title": "For a Few Dollars More",
    "duration": 132,
    "mpaaRating": "R",
    "releaseDate": "1967-05-10T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1965
  },
  {
    "title": "Snatch.",
    "duration": 102,
    "mpaaRating": "R",
    "releaseDate": "2001-01-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2000
  },
  {
    "title": "Inglourious Basterds",
    "duration": 153,
    "mpaaRating": "R",
    "releaseDate": "2009-08-21T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2009
  },
  {
    "title": "On the Waterfront",
    "duration": 108,
    "mpaaRating": null,
    "releaseDate": "1954-06-24T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1954
  },
  {
    "title": "The Elephant Man",
    "duration": 124,
    "mpaaRating": "PG",
    "releaseDate": "1980-10-10T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1980
  },
  {
    "title": "The Seventh Seal",
    "duration": 96,
    "mpaaRating": null,
    "releaseDate": "1958-10-13T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1957
  },
  {
    "title": "Toy Story",
    "duration": 81,
    "mpaaRating": "TV-G",
    "releaseDate": "1995-11-22T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1995
  },
  {
    "title": "The Maltese Falcon",
    "duration": 100,
    "mpaaRating": null,
    "releaseDate": "1941-10-18T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1941
  },
  {
    "title": "Heat",
    "duration": 170,
    "mpaaRating": "R",
    "releaseDate": "1995-12-15T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1995
  },
  {
    "title": "The General",
    "duration": 75,
    "mpaaRating": null,
    "releaseDate": "1927-02-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1926
  },
  {
    "title": "Gran Torino",
    "duration": 116,
    "mpaaRating": "R",
    "releaseDate": "2009-01-09T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2008
  },
  {
    "title": "Rebecca",
    "duration": 130,
    "mpaaRating": null,
    "releaseDate": "1940-04-12T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1940
  },
  {
    "title": "Blade Runner",
    "duration": 117,
    "mpaaRating": "R",
    "releaseDate": "1982-06-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1982
  },
  {
    "title": "The Avengers",
    "duration": 143,
    "mpaaRating": "PG-13",
    "releaseDate": "2012-05-04T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2012
  },
  {
    "title": "Wild Strawberries",
    "duration": 91,
    "mpaaRating": null,
    "releaseDate": "1959-06-22T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1957
  },
  {
    "title": "Fargo",
    "duration": 98,
    "mpaaRating": "R",
    "releaseDate": "1996-04-05T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1996
  },
  {
    "title": "The Kid",
    "duration": 68,
    "mpaaRating": null,
    "releaseDate": "1921-02-06T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1921
  },
  {
    "title": "Scarface",
    "duration": 170,
    "mpaaRating": "R",
    "releaseDate": "1983-12-09T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1983
  },
  {
    "title": "Touch of Evil",
    "duration": 108,
    "mpaaRating": "PG-13",
    "releaseDate": "1958-06-08T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1958
  },
  {
    "title": "The Big Lebowski",
    "duration": 117,
    "mpaaRating": "R",
    "releaseDate": "1998-03-06T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1998
  },
  {
    "title": "Ran",
    "duration": 162,
    "mpaaRating": "R",
    "releaseDate": "1985-06-01T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1985
  },
  {
    "title": "The Deer Hunter",
    "duration": 182,
    "mpaaRating": "R",
    "releaseDate": "1979-02-23T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1978
  },
  {
    "title": "Cool Hand Luke",
    "duration": 126,
    "mpaaRating": null,
    "releaseDate": "1967-11-01T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1967
  },
  {
    "title": "Sin City",
    "duration": 147,
    "mpaaRating": "R",
    "releaseDate": "2005-04-01T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2005
  },
  {
    "title": "The Gold Rush",
    "duration": 72,
    "mpaaRating": null,
    "releaseDate": "1925-06-26T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1925
  },
  {
    "title": "Strangers on a Train",
    "duration": 101,
    "mpaaRating": null,
    "releaseDate": "1951-06-30T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1951
  },
  {
    "title": "It Happened One Night",
    "duration": 105,
    "mpaaRating": null,
    "releaseDate": "1934-02-23T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1934
  },
  {
    "title": "No Country for Old Men",
    "duration": 122,
    "mpaaRating": "R",
    "releaseDate": "2007-11-21T00:00:00Z",
    "bestPictureWinner": true,
    "year": 2007
  },
  {
    "title": "Jaws",
    "duration": 130,
    "mpaaRating": "PG",
    "releaseDate": "1975-06-20T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1975
  },
  {
    "title": "Lock, Stock and Two Smoking Barrels",
    "duration": 107,
    "mpaaRating": "R",
    "releaseDate": "1999-03-05T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1998
  },
  {
    "title": "The Sixth Sense",
    "duration": 107,
    "mpaaRating": "PG-13",
    "releaseDate": "1999-08-06T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1999
  },
  {
    "title": "Hotel Rwanda",
    "duration": 121,
    "mpaaRating": "PG-13",
    "releaseDate": "2005-02-04T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2004
  },
  {
    "title": "High Noon",
    "duration": 85,
    "mpaaRating": null,
    "releaseDate": "1952-07-30T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1952
  },
  {
    "title": "Platoon",
    "duration": 120,
    "mpaaRating": "R",
    "releaseDate": "1986-12-24T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1986
  },
  {
    "title": "The Thing",
    "duration": 109,
    "mpaaRating": "R",
    "releaseDate": "1982-06-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1982
  },
  {
    "title": "Butch Cassidy and the Sundance Kid",
    "duration": 110,
    "mpaaRating": "PG",
    "releaseDate": "1969-10-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1969
  },
  {
    "title": "The Wizard of Oz",
    "duration": 101,
    "mpaaRating": null,
    "releaseDate": "1939-08-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1939
  },
  {
    "title": "Casino",
    "duration": 178,
    "mpaaRating": "R",
    "releaseDate": "1995-11-22T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1995
  },
  {
    "title": "Trainspotting",
    "duration": 94,
    "mpaaRating": "R",
    "releaseDate": "1996-07-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1996
  },
  {
    "title": "Kill Bill: Vol. 1",
    "duration": 111,
    "mpaaRating": "TV-14",
    "releaseDate": "2003-10-10T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2003
  },
  {
    "title": "Warrior",
    "duration": 140,
    "mpaaRating": "PG-13",
    "releaseDate": "2011-09-09T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2011
  },
  {
    "title": "Annie Hall",
    "duration": 93,
    "mpaaRating": "PG",
    "releaseDate": "1977-04-20T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1977
  },
  {
    "title": "Notorious",
    "duration": 101,
    "mpaaRating": null,
    "releaseDate": "1946-09-06T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1946
  },
  {
    "title": "The Secret in Their Eyes",
    "duration": 129,
    "mpaaRating": "R",
    "releaseDate": "2009-08-13T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2009
  },
  {
    "title": "Gone with the Wind",
    "duration": 238,
    "mpaaRating": "G",
    "releaseDate": "1940-01-17T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1939
  },
  {
    "title": "Good Will Hunting",
    "duration": 126,
    "mpaaRating": "R",
    "releaseDate": "1998-01-09T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1997
  },
  {
    "title": "The King's Speech",
    "duration": 118,
    "mpaaRating": "R",
    "releaseDate": "2010-12-24T00:00:00Z",
    "bestPictureWinner": true,
    "year": 2010
  },
  {
    "title": "The Grapes of Wrath",
    "duration": 129,
    "mpaaRating": null,
    "releaseDate": "1940-03-15T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1940
  },
  {
    "title": "Into the Wild",
    "duration": 148,
    "mpaaRating": "R",
    "releaseDate": "2007-09-21T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2007
  },
  {
    "title": "Life of Brian",
    "duration": 94,
    "mpaaRating": "R",
    "releaseDate": "1979-08-17T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1979
  },
  {
    "title": "Finding Nemo",
    "duration": 100,
    "mpaaRating": "G",
    "releaseDate": "2003-05-30T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2003
  },
  {
    "title": "V for Vendetta",
    "duration": 132,
    "mpaaRating": "R",
    "releaseDate": "2006-03-17T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2005
  },
  {
    "title": "How to Train Your Dragon",
    "duration": 98,
    "mpaaRating": "PG",
    "releaseDate": "2010-03-26T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2010
  },
  {
    "title": "My Neighbor Totoro",
    "duration": 86,
    "mpaaRating": "G",
    "releaseDate": "1988-04-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1988
  },
  {
    "title": "The Big Sleep",
    "duration": 114,
    "mpaaRating": null,
    "releaseDate": "1946-08-31T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1946
  },
  {
    "title": "Dial M for Murder",
    "duration": 105,
    "mpaaRating": "PG",
    "releaseDate": "1954-05-29T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1954
  },
  {
    "title": "Ben-Hur",
    "duration": 212,
    "mpaaRating": null,
    "releaseDate": "1960-03-30T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1959
  },
  {
    "title": "The Terminator",
    "duration": 107,
    "mpaaRating": "R",
    "releaseDate": "1984-10-26T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1984
  },
  {
    "title": "Network",
    "duration": 121,
    "mpaaRating": "R",
    "releaseDate": "1976-11-27T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1976
  },
  {
    "title": "Million Dollar Baby",
    "duration": 132,
    "mpaaRating": "PG-13",
    "releaseDate": "2005-01-28T00:00:00Z",
    "bestPictureWinner": true,
    "year": 2004
  },
  {
    "title": "Black Swan",
    "duration": 108,
    "mpaaRating": "R",
    "releaseDate": "2010-12-17T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2010
  },
  {
    "title": "The Night of the Hunter",
    "duration": 93,
    "mpaaRating": null,
    "releaseDate": "1955-11-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1955
  },
  {
    "title": "There Will Be Blood",
    "duration": 158,
    "mpaaRating": "R",
    "releaseDate": "2008-01-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2007
  },
  {
    "title": "Stand by Me",
    "duration": 89,
    "mpaaRating": "R",
    "releaseDate": "1986-08-08T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1986
  },
  {
    "title": "Donnie Darko",
    "duration": 113,
    "mpaaRating": "R",
    "releaseDate": "2002-01-30T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2001
  },
  {
    "title": "Groundhog Day",
    "duration": 101,
    "mpaaRating": "PG",
    "releaseDate": "1993-02-12T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1993
  },
  {
    "title": "Dog Day Afternoon",
    "duration": 125,
    "mpaaRating": "R",
    "releaseDate": "1975-09-21T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1975
  },
  {
    "title": "Twelve Monkeys",
    "duration": 129,
    "mpaaRating": "R",
    "releaseDate": "1996-01-05T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1995
  },
  {
    "title": "Amores Perros",
    "duration": 154,
    "mpaaRating": "R",
    "releaseDate": "2000-06-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2000
  },
  {
    "title": "The Bourne Ultimatum",
    "duration": 115,
    "mpaaRating": "PG-13",
    "releaseDate": "2007-08-03T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2007
  },
  {
    "title": "Mary and Max",
    "duration": 92,
    "mpaaRating": null,
    "releaseDate": "2009-04-09T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2009
  },
  {
    "title": "The 400 Blows",
    "duration": 99,
    "mpaaRating": null,
    "releaseDate": "1959-11-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1959
  },
  {
    "title": "Persona",
    "duration": 83,
    "mpaaRating": null,
    "releaseDate": "1967-03-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1966
  },
  {
    "title": "The Graduate",
    "duration": 106,
    "mpaaRating": null,
    "releaseDate": "1967-12-22T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1967
  },
  {
    "title": "Gandhi",
    "duration": 191,
    "mpaaRating": "PG",
    "releaseDate": "1983-02-25T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1982
  },
  {
    "title": "The Killing",
    "duration": 85,
    "mpaaRating": null,
    "releaseDate": "1956-06-06T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1956
  },
  {
    "title": "Howl's Moving Castle",
    "duration": 119,
    "mpaaRating": "PG",
    "releaseDate": "2005-06-17T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2004
  },
  {
    "title": "The Artist",
    "duration": 100,
    "mpaaRating": "PG-13",
    "releaseDate": "2012-01-20T00:00:00Z",
    "bestPictureWinner": true,
    "year": 2011
  },
  {
    "title": "The Princess Bride",
    "duration": 98,
    "mpaaRating": "PG",
    "releaseDate": "1987-09-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1987
  },
  {
    "title": "Argo",
    "duration": 120,
    "mpaaRating": "R",
    "releaseDate": "2012-10-12T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2012
  },
  {
    "title": "Slumdog Millionaire",
    "duration": 120,
    "mpaaRating": "R",
    "releaseDate": "2009-01-23T00:00:00Z",
    "bestPictureWinner": true,
    "year": 2008
  },
  {
    "title": "Who's Afraid of Virginia Woolf?",
    "duration": 131,
    "mpaaRating": null,
    "releaseDate": "1966-06-22T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1966
  },
  {
    "title": "La Strada",
    "duration": 108,
    "mpaaRating": "PG",
    "releaseDate": "1956-07-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1954
  },
  {
    "title": "The Manchurian Candidate",
    "duration": 126,
    "mpaaRating": null,
    "releaseDate": "1962-10-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1962
  },
  {
    "title": "The Hustler",
    "duration": 134,
    "mpaaRating": null,
    "releaseDate": "1961-09-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1961
  },
  {
    "title": "A Beautiful Mind",
    "duration": 135,
    "mpaaRating": "PG-13",
    "releaseDate": "2002-01-04T00:00:00Z",
    "bestPictureWinner": true,
    "year": 2001
  },
  {
    "title": "The Wild Bunch",
    "duration": 145,
    "mpaaRating": "R",
    "releaseDate": "1969-06-18T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1969
  },
  {
    "title": "Rocky",
    "duration": 119,
    "mpaaRating": "PG",
    "releaseDate": "1976-12-03T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1976
  },
  {
    "title": "Anatomy of a Murder",
    "duration": 160,
    "mpaaRating": "TV-PG",
    "releaseDate": "1959-09-01T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1959
  },
  {
    "title": "Stalag 17",
    "duration": 120,
    "mpaaRating": null,
    "releaseDate": "1953-08-10T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1953
  },
  {
    "title": "The Exorcist",
    "duration": 122,
    "mpaaRating": "R",
    "releaseDate": "1974-03-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1973
  },
  {
    "title": "Sleuth",
    "duration": 138,
    "mpaaRating": "PG",
    "releaseDate": "1972-12-10T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1972
  },
  {
    "title": "Rope",
    "duration": 80,
    "mpaaRating": null,
    "releaseDate": "1948-08-28T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1948
  },
  {
    "title": "Barry Lyndon",
    "duration": 184,
    "mpaaRating": "PG",
    "releaseDate": "1975-12-18T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1975
  },
  {
    "title": "The Man Who Shot Liberty Valance",
    "duration": 123,
    "mpaaRating": null,
    "releaseDate": "1962-04-22T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1962
  },
  {
    "title": "District 9",
    "duration": 112,
    "mpaaRating": "R",
    "releaseDate": "2009-08-14T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2009
  },
  {
    "title": "Stalker",
    "duration": 163,
    "mpaaRating": null,
    "releaseDate": "1980-04-17T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1979
  },
  {
    "title": "Infernal Affairs",
    "duration": 101,
    "mpaaRating": "R",
    "releaseDate": "2002-12-12T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2002
  },
  {
    "title": "Roman Holiday",
    "duration": 118,
    "mpaaRating": null,
    "releaseDate": "1953-09-02T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1953
  },
  {
    "title": "The Truman Show",
    "duration": 103,
    "mpaaRating": "PG",
    "releaseDate": "1998-06-05T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1998
  },
  {
    "title": "Ratatouille",
    "duration": 111,
    "mpaaRating": "G",
    "releaseDate": "2007-06-29T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2007
  },
  {
    "title": "Pirates of the Caribbean: The Curse of the Black Pearl",
    "duration": 143,
    "mpaaRating": "PG-13",
    "releaseDate": "2003-07-09T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2003
  },
  {
    "title": "Ip Man",
    "duration": 106,
    "mpaaRating": "R",
    "releaseDate": "2008-12-12T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2008
  },
  {
    "title": "The Diving Bell and the Butterfly",
    "duration": 112,
    "mpaaRating": "PG-13",
    "releaseDate": "2007-05-23T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2007
  },
  {
    "title": "Harry Potter and the Deathly Hallows: Part 2",
    "duration": 130,
    "mpaaRating": "PG-13",
    "releaseDate": "2011-07-15T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2011
  },
  {
    "title": "A Fistful of Dollars",
    "duration": 99,
    "mpaaRating": "R",
    "releaseDate": "1967-01-18T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1964
  },
  {
    "title": "A Streetcar Named Desire",
    "duration": 125,
    "mpaaRating": "PG",
    "releaseDate": "1951-12-01T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1951
  },
  {
    "title": "Monsters, Inc.",
    "duration": 92,
    "mpaaRating": "G",
    "releaseDate": "2001-11-02T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2001
  },
  {
    "title": "In the Name of the Father",
    "duration": 133,
    "mpaaRating": "R",
    "releaseDate": "1994-02-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1993
  },
  {
    "title": "Star Trek",
    "duration": 127,
    "mpaaRating": "PG-13",
    "releaseDate": "2009-05-08T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2009
  },
  {
    "title": "Beauty and the Beast",
    "duration": 84,
    "mpaaRating": "G",
    "releaseDate": "1991-11-22T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1991
  },
  {
    "title": "Rosemary's Baby",
    "duration": 136,
    "mpaaRating": "R",
    "releaseDate": "1968-06-12T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1968
  },
  {
    "title": "Harvey",
    "duration": 104,
    "mpaaRating": null,
    "releaseDate": "1950-10-13T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1950
  },
  {
    "title": "Nauticaä of the Valley of the Wind",
    "duration": 117,
    "mpaaRating": "PG",
    "releaseDate": "1984-03-11T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1984
  },
  {
    "title": "The Wrestler",
    "duration": 109,
    "mpaaRating": "R",
    "releaseDate": "2009-01-30T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2008
  },
  {
    "title": "All Quiet on the Western Front",
    "duration": 133,
    "mpaaRating": null,
    "releaseDate": "1930-08-24T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1930
  },
  {
    "title": "La Haine",
    "duration": 98,
    "mpaaRating": null,
    "releaseDate": "1996-02-23T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1995
  },
  {
    "title": "Rain Man",
    "duration": 133,
    "mpaaRating": "R",
    "releaseDate": "1988-12-16T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1988
  },
  {
    "title": "Battleship Potemkin",
    "duration": 66,
    "mpaaRating": null,
    "releaseDate": "1925-12-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1925
  },
  {
    "title": "Shutter Island",
    "duration": 138,
    "mpaaRating": "R",
    "releaseDate": "2010-02-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2010
  },
  {
    "title": "Nosferatu",
    "duration": 81,
    "mpaaRating": null,
    "releaseDate": "1929-06-03T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1922
  },
  {
    "title": "Spring, Summer, Fall, Winter... and Spring",
    "duration": 103,
    "mpaaRating": "R",
    "releaseDate": "2003-09-19T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2003
  },
  {
    "title": "Manhattan",
    "duration": 96,
    "mpaaRating": "R",
    "releaseDate": "1979-04-25T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1979
  },
  {
    "title": "Mystic River",
    "duration": 138,
    "mpaaRating": "R",
    "releaseDate": "2003-10-15T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2003
  },
  {
    "title": "Bringing Up Baby",
    "duration": 102,
    "mpaaRating": null,
    "releaseDate": "1938-02-18T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1938
  },
  {
    "title": "Shadow of a Doubt",
    "duration": 108,
    "mpaaRating": null,
    "releaseDate": "1943-01-15T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1943
  },
  {
    "title": "Big Fish",
    "duration": 125,
    "mpaaRating": "PG-13",
    "releaseDate": "2004-01-09T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2003
  },
  {
    "title": "Castle in the Sky",
    "duration": 124,
    "mpaaRating": "PG",
    "releaseDate": "1986-08-02T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1986
  },
  {
    "title": "Papillon",
    "duration": 151,
    "mpaaRating": "PG",
    "releaseDate": "1973-12-16T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1973
  },
  {
    "title": "The Nightmare Before Christmas",
    "duration": 76,
    "mpaaRating": "PG",
    "releaseDate": "1993-10-29T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1993
  },
  {
    "title": "The Untouchables",
    "duration": 119,
    "mpaaRating": "R",
    "releaseDate": "1987-06-03T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1987
  },
  {
    "title": "Jurassic Park",
    "duration": 127,
    "mpaaRating": "PG-13",
    "releaseDate": "1993-06-11T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1993
  },
  {
    "title": "Let the Right One In",
    "duration": 115,
    "mpaaRating": "R",
    "releaseDate": "2008-10-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2008
  },
  {
    "title": "In the Heat of the Night",
    "duration": 109,
    "mpaaRating": null,
    "releaseDate": "1967-10-14T00:00:00Z",
    "bestPictureWinner": true,
    "year": 1967
  },
  {
    "title": "3 Idiots",
    "duration": 170,
    "mpaaRating": "PG-13",
    "releaseDate": "2009-12-24T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2009
  },
  {
    "title": "Arsenic and Old Lace",
    "duration": 118,
    "mpaaRating": null,
    "releaseDate": "1944-09-23T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1944
  },
  {
    "title": "The Searchers",
    "duration": 119,
    "mpaaRating": null,
    "releaseDate": "1956-03-13T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1956
  },
  {
    "title": "In the Mood for Love",
    "duration": 98,
    "mpaaRating": "PG",
    "releaseDate": "2000-09-29T00:00:00Z",
    "bestPictureWinner": false,
    "year": 2000
  },
  {
    "title": "Rio Bravo",
    "duration": 141,
    "mpaaRating": null,
    "releaseDate": "1959-04-04T00:00:00Z",
    "bestPictureWinner": false,
    "year": 1959
  }
];