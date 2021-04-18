import * as d3 from 'd3';
async function drawBarChart() {
  const data = await d3.json('./my_weather_data.json');
  console.log(data);
  const xAccessor = (d) => d.humidity;
  const yAccessor = (d) => d.length;
  const width = 600;
  const dms = {
    width,
    height: 300,
    margin: {
      top: 30,
      left: 50,
      right: 10,
      bottom: 50,
    },
  };
  dms.boundedWidth = dms.width - dms.margin.left - dms.margin.right;
  dms.boundedHeight = dms.height - dms.margin.top - dms.margin.bottom;
  const wrapper = d3
    .select('#wrapper')
    .append('svg')
    .attr('width', dms.width)
    .attr('height', dms.height)
    .style('border', '1px solid grey');
  const bounded = wrapper
    .append('g')
    .style('transform', `translate(${dms.margin.left}px,${dms.margin.top}px)`);

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(data, xAccessor))
    .range([0, dms.boundedWidth])
    .nice();

  const binsGenerator = d3
    .bin()
    .domain(xScale.domain())
    .value(xAccessor)
    .thresholds(12);

  const bins = binsGenerator(data);
  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(bins, yAccessor)])
    .range([dms.boundedHeight, 0])
    .nice();

  const binsGroup = bounded.append('g');

  const binGroups = binsGroup.selectAll('g').data(bins).join('g');
  const barPadding = 1;
  const barRects = binGroups
    .append('rect')
    .attr('x', (d) => xScale(d.x0) + barPadding / 2)
    .attr('y', (d) => yScale(yAccessor(d)))
    .attr('width', (d) =>
      d3.max([0, -xScale(d.x0) + xScale(d.x1) - barPadding])
    )
    .attr('height', (d) => dms.boundedHeight - yScale(yAccessor(d)))
    .attr('fill', 'cornflowerblue');

  const barText = binGroups
    .filter(yAccessor)
    .append('text')
    .attr('x', (d) => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
    .attr('y', (d) => yScale(yAccessor(d)) - 5)
    .text(yAccessor)
    .style('text-anchor', 'middle')
    .style('font-family', 'serif')
    .style('font-size', '12px')
    .style('fill', 'darkgrey');
  const mean = d3.mean(data, xAccessor);
  const meanLine = bounded
    .append('line')
    .attr('x1', xScale(mean))
    .attr('x2', xScale(mean))
    .attr('y1', -15)
    .attr('y2', dms.boundedHeight)
    .attr('stroke', 'maroon')
    .style('stroke-dasharray', '2px 4px');

  const meanText = bounded
    .append('text')
    .attr('x', xScale(mean))
    .attr('y', -15);
}

drawBarChart();
