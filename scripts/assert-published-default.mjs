function getPublishedDefaultSite(sites) {
  return sites.find((site) => site.published && site.isDefault);
}

const samples = [
  {
    name: 'none',
    sites: [
      { slug: 'a', published: true, isDefault: false },
      { slug: 'b', published: true, isDefault: false },
    ],
    expect: undefined,
  },
  {
    name: 'unpublished-default-ignored',
    sites: [{ slug: 'a', published: false, isDefault: true }],
    expect: undefined,
  },
  {
    name: 'published-default',
    sites: [
      { slug: 'a', published: true, isDefault: false },
      { slug: 'b', published: true, isDefault: true },
    ],
    expect: 'b',
  },
];

for (const sample of samples) {
  const got = getPublishedDefaultSite(sample.sites);
  const slug = got?.slug;
  if (slug !== sample.expect) {
    console.error(`FAIL ${sample.name}: got ${slug}, expect ${sample.expect}`);
    process.exit(1);
  }
}
console.log('assert-published-default: ok');
