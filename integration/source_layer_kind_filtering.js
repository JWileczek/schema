
// validate analyzer is behaving as expected

var tape = require('tape'),
    elastictest = require('elastictest'),
    schema = require('../schema'),
    punctuation = require('../punctuation');

module.exports.tests = {};

module.exports.tests.source_filter = function(test, common){
  test( 'source filter', function(t){

    var suite = new elastictest.Suite( null, { schema: schema } );
    suite.action( function( done ){ setTimeout( done, 500 ); }); // wait for es to bring some shards up

    // index some docs
    suite.action( function( done ){
      suite.client.index({
        index: suite.props.index, type: 'test',
        id: '1', body: { source: 'osm', layer: 'node', kind: 'shop' }
      }, done );
    });

    suite.action( function( done ){
      suite.client.index({
        index: suite.props.index, type: 'test',
        id: '2', body: { source: 'osm', layer: 'address', kind: 'bank' }
      }, done );
    });

    suite.action( function( done ){
      suite.client.index({
        index: suite.props.index, type: 'test',
        id: '3', body: { source: 'geonames', layer: 'address', kind: 'shop' }
      }, done );
    });

    suite.action( function( done ){
      suite.client.index({
        index: suite.props.index, type: 'test',
        id: '4', body: { source: 'foo bar baz' }
      }, done );
    });

    // find all 'osm' sources
    suite.assert( function( done ){
      suite.client.search({
        index: suite.props.index,
        type: 'test',
        body: { filter: { bool: { must: [
          { term: { source: 'osm' } }
        ]}}}
      }, function( err, res ){
        t.equal( res.hits.total, 2 );
        done();
      });
    });

    // find all 'address' layers
    suite.assert( function( done ){
      suite.client.search({
        index: suite.props.index,
        type: 'test',
        body: { filter: { bool: { must: [
          { term: { layer: 'address' } }
        ]}}}
      }, function( err, res ){
        t.equal( res.hits.total, 2 );
        done();
      });
    });

    // find all 'shop' kinds
    suite.assert( function( done ){
      suite.client.search({
        index: suite.props.index,
        type: 'test',
        body: { filter: { bool: { must: [
          { term: { kind: 'shop' } }
        ]}}}
      }, function( err, res ){
        t.equal( res.hits.total, 2 );
        done();
      });
    });

    // find all 'shop' kinds from 'osm' source
    suite.assert( function( done ){
      suite.client.search({
        index: suite.props.index,
        type: 'test',
        body: { filter: { bool: { must: [
          { term: { source: 'osm' } },
          { term: { kind: 'shop' } }
        ]}}}
      }, function( err, res ){
        t.equal( res.hits.total, 1 );
        done();
      });
    });

    // case sensitive
    suite.assert( function( done ){
      suite.client.search({
        index: suite.props.index,
        type: 'test',
        body: { filter: { bool: { must: [
          { term: { source: 'OSM' } }
        ]}}}
      }, function( err, res ){
        t.equal( res.hits.total, 0 );
        done();
      });
    });

    // keyword analysis - no partial matching
    suite.assert( function( done ){
      suite.client.search({
        index: suite.props.index,
        type: 'test',
        body: { filter: { bool: { must: [
          { term: { source: 'foo' } }
        ]}}}
      }, function( err, res ){
        t.equal( res.hits.total, 0 );
        done();
      });
    });

    // keyword analysis - allows spaces
    suite.assert( function( done ){
      suite.client.search({
        index: suite.props.index,
        type: 'test',
        body: { filter: { bool: { must: [
          { term: { source: 'foo bar baz' } }
        ]}}}
      }, function( err, res ){
        t.equal( res.hits.total, 1 );
        done();
      });
    });

    suite.run( t.end );
  });
};

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('field filtering: ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};
