"""Optional independent distribution checks. Requires scipy, never accesses user data."""
import json
from pathlib import Path
from scipy.stats import norm,binom,poisson,chi2,hypergeom,chi2_contingency
from math import sqrt,ceil
checks=[
('112-2s-11',binom.sf(0,7,.15),.6794,.00005),
('112-2s-23',3/sqrt(4.6*(1/16+1/11)),3.571,.001),
('112-2s-37',chi2_contingency([[15,75,20],[26,60,4]],correction=False).statistic,13.42,.005),
('112-2s-38',sum((o-e)**2/e for o,e in zip([3,15,22,10],[6,20,19,5])),8.22,.005),
('105-2s-27',2*norm.cdf((788-800)/(40/sqrt(30))),.1003,.0001),
('105-2s-40',binom.sf(6,10,.25),.003506,.000001),
('104-2s-36',ceil(1.645**2*.5/.025**2)*2,4330,.1),
('104-2s-39',40/62,.645,.001),
('103-2s-5',.95*.85/(.95*.85+.05*.12),.9926,.0001),
('103-2s-9',hypergeom.var(300,180,20),4.495,.001),
('103-2s-14',binom.sf(1,10,.4),.9536,.0001),
('103-2s-15',sqrt((310/560)*(1-310/560)/560+(300/640)*(1-300/640)/640),.02882,.00001),
('103-2s-18',ceil(1.96**2*.3*.7/.03**2),897,.1),
('103-2s-31',sqrt(1.5916*.6011),.9781,.0001),
('103-2s-37',chi2_contingency([[35,20,35],[55,30,25]],correction=False).statistic,6.173,.001),
('102-2s-21 lower',12.3**2*chi2.ppf(.05,24)/24,87.2968,.001),
('102-2s-21 upper',12.3**2*chi2.ppf(.95,24)/24,229.5517,.001),
('102-2s-36 lower',chi2.ppf(.05,14),6.571,.001),
('102-2s-36 upper',chi2.ppf(.95,14),23.685,.001),
('102-2s-38',sum((o-e)**2/e for o,e in zip([83,68,85,64],[90,72,78,60])),1.6615,.0001),
('101-2s-2',sqrt(158/7),4.751,.001),
('101-2s-9',hypergeom.pmf(3,50,44,3),.6757,.0001),
('101-2s-22',norm.cdf((25.3-22)/2.4)-norm.cdf((19.7-22)/2.4),.7464,.0001),
('100-2s-15',poisson.pmf(5,2),.0361,.0001),
('100-2s-17',9/-norm.ppf(.025),4.59,.01),
('100-2s-24',710.01**2/(3.43*203400),.72259,.0001),
('099-2s-17',binom.pmf(55,100,.5),.04847,.00001),
('099-2s-27',norm.sf(2),.0228,.0001),
('099-2s-36',norm.sf(2.5),.0062,.0001),
('098-2s-18 lower',19*.4**2/chi2.ppf(.975,19),.0925,.0001),
('098-2s-18 upper',19*.4**2/chi2.ppf(.025,19),.3413,.0001),
]
root=Path(__file__).resolve().parents[2]
for id,actual,expected,tol in checks:
 exam_id=id.split()[0].rsplit('-',1)[0]
 review=json.loads((root/'data/professional-reviews'/(exam_id+'.json')).read_text())
 summary=review['entries'][id.split()[0]]['explanation']['summary']
 shown='99.26' if id=='103-2s-5' else str(expected)
 assert shown in summary,(id,'published calculation no longer matches verified number',shown)
failures=[(id,actual,expected) for id,actual,expected,tol in checks if abs(actual-expected)>=tol]
print('Numerical discrepancies:',failures)
assert not failures
print('Independent SciPy distribution and numerical checks passed:',len(checks))
