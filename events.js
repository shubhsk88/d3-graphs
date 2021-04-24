import * as d3 from 'd3';

const createEvent = async () => {
  const arr = ['blue', 'green', 'teal', 'orange'];

  const rects = d3
    .select('#svg')
    .selectAll('.rect')
    .data(arr)
    .join('rect')
    .attr('width', 100)
    .attr('height', 100)
    .attr('x', (d, i) => 110 * i)
    .attr('fill', 'lightgrey');

  rects
    .on('mouseenter', (event, d) => {
      const selection = d3.select(event.currentTarget);
      selection.attr('fill', d);
    })
    .on('mouseout', (event) => {
      const selection = d3.select(event.currentTarget);
      selection.attr('fill', 'lightgrey');
    });
};

createEvent();
