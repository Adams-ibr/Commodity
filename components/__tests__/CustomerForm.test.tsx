import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerForm } from '../CustomerForm';
import { CustomerType } from '../../types';

// Mock customer data
const mockCustomer = {
  id: 'test-customer-1',
  name: 'Test Customer',
  type: CustomerType.DEALER,
  contactInfo: {
    phone: '+234 803 123 4567',
    email: 'test@example.com',
    address: '123 Test Street, Lagos'
  },
  status: 'Active' as const,
  createdDate: '2024-01-01T00:00:00Z',
  totalPurchases: 100000,
  averageTransactionSize: 10000,
  notes: 'Test customer notes'
};

describe('CustomerForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Validation', () => {
    it('should require customer name', async () => ;
}););
  })   }
 t();ocumentoBeInTheDe')).ivlue('InactsplayVareen.getByDiect(scxp

      eve' } });Inacti: { value: 'arget { tsSelect,e(statuangchfireEvent.e');
      ue('ActivsplayValyDireen.getBelect = sct statusSns
      co
 );    
 
        />ancel}kOnCmocel={   onCance}
       {mockOnSave= onSav      orm
   erF  <Custom      
   render(=> {
   us', () statof customer  selection ld allowhou
    it('s
    });
;t()menBeInTheDocualer')).tolayValue('DeByDispetect(screen.g
      expR } });
Type.DEALE Customervalue:get: { lect, { tarnge(typeSeireEvent.cha      f');
sernd Ue('EplayValugetByDisreen.scct = ypeSele    const t

  );   
           />nCancel}
kOancel={moc onC
         Save}{mockOnonSave=        erForm
  om      <Custnder(
    re  () => {
  , ype'omer tf custon oselectiallow ld 'shou
    it(> {', () =omer Typesibe('Custescr

  d });    });
 0');
city-5ed:opadisabllass('aveC/i })).toHe customerat: /cre, { name'button'ole(n.getByRt(scree  expec    abled();
.toBeDistButton)ct(submiexpe
      tomer/i });reate cus, { name: /cle('button'yRoreen.getB scButton =submitconst 
            );
    />
{true}
    ng=     isLoadiel}
     kOnCancl={mocceCan      on  e}
  ockOnSav  onSave={mm
        ustomerFor   <C
         render(   () => {
rue',ding is tLoan isng state wheoadiow ld sh'shoulit(;

    
    })led();veBeenCalcel).toHanCanexpect(mockO

      lButton);k(cancent.clic     fireEve;
 ncel')ext('Caeen.getByTn = scrncelButto    const ca
  
 );  
   />    
    cel}mockOnCanl={   onCancee}
       SavckOnve={mo       onSarm
    <CustomerFo     (
  ender> {
      ricked', () =on is cl butten cancelwhcel nCan call o('should> {
    it() =ns', 'Form Actioescribe(;

  d});
  })   
 nt();cumeTheDo.toBeInmer'))e Custoext('Updateen.getByT  expect(scr
    nt();Docume)).toBeInThereet, Lagos' Test StayValue('123ByDisplreen.get expect(sc     nt();
umetoBeInTheDocple.com')).('test@examDisplayValueetBycreen.gpect(s exnt();
     nTheDocumetoBeI3 4567')). 803 12yValue('+234laispeen.getByDct(scr
      expeument();eInTheDoc.toBealer'))Value('DDisplayscreen.getBy    expect(nt();
  TheDocumeBeIn).toer')est Customalue('TDisplayV.getBy(screenexpect;

       />
      )
       ancel}l={mockOnC onCance      ve}
   ockOnSa{mnSave=      or}
    ckCustomer={mo   customem
       <CustomerFor    ender(
    
      r { () =>',ditingr data for eting customeexiswith  form ulatepopit('should       });

     });
      );
    })
    ve'
       cti: 'Astatus           }),
       
      .com'example 'customer@l: emai           
  7',45623  '+234 803 1ne:      pho        ng({
jectContaini.ob expecttInfo:  contac         LER,
 ype.DEACustomerType:       t  
    tomer', Cusname: 'New     
       ing({aint.objectContxpec  e        th(
nCalledWiBeeSave).toHavepect(mockOn   ex{
     or(() => ait waitFaw
      tton);
tBusubmivent.click(
      fireEomer');Custate xt('CreyTeen.getB scren = submitButtonst    co
      });
om' }
  ample.cr@exstomelue: 'cuva {  target:   {
    , xample.com')mer@eustoderText('colPlacehscreen.getByange(vent.ch    fireE  });

  567' }
    123 44 803 alue: '+23get: { v        tar {
 xxxx'),xxx xxxText('+234 yPlaceholdercreen.getBange(sfireEvent.ch

           });LER }
 merType.DEAe: Custoet: { valurg     ta   {
er'), d Us'EnValue(isplayetByDscreen.ghange(.cventfireE
            });
ustomer' }
e: 'New Cet: { valu     targ  '), {
 mer na customext('EntereholderTeetByPlacreen.g(scnt.changereEve fiform
     ll out the  // Fi

           );    />
el}
    ancOnCocknCancel={m        onSave}
  ckO onSave={mo       
  stomerForm     <Cu      render(
  => {
 ', async () ustomerfor new cta m da valid forould submit'sh
    it(, () => {ion'Form Submissscribe(';

  de });
  });
   BeenCalled()avenot.toHve).nSaxpect(mockO      e   });

ment();
   InTheDocumber')).toBephone nud a valienter ('Please getByTextct(screen.xpe      e() => {
  it waitFor(wa     a
 on);
Buttbmitlick(suireEvent.c
      fr');e Customet('Creatn.getByTex= screeon Buttonst submit

      c});ue: '123' } t: { valut, { targeInpe(phonet.chang  fireEven });
     Customer' }: 'Test: { valuegetInput, { targe(nameEvent.chanre

      fix');xxx xxx xxx+234 ('exterTaceholdreen.getByPlnput = scst phoneI     con');
 omer name custt('EnterexeholderTetByPlaceen.gput = scrIn const name

        );   />
     l}
   nceel={mockOnCanCanc  o     nSave}
   ={mockO     onSave   rm
  merFo      <Custo
  der(
      ren () => {t', asyncmanumber forne e phold validatou    it('sh  });

ed();
  eenCallot.toHaveB).n(mockOnSave      expect  });


    ment();eInTheDocudress')).toBemail ader a valid lease ent'Pext(tByTen.geexpect(scre      ) => {
  r(( waitFoait    aw);

  submitButtonck(lint.c   fireEve);
   stomer't('Create Cu.getByTex= screentButton mi sub const);

     l' } }invalid-emaivalue: ': { etnput, { targmailIent.change(e   fireEv);
   omer' } }Test Custlue: 't: { va, { targe(nameInputchangent.ve    fireE
  .com');
pleustomer@examext('colderTehPlacByn.getut = screeemailInp     const 
 omer name');stnter cuerText('EceholdtByPlan.geut = screenst nameInp    co

  
      ); />
       ckOnCancel}ancel={mo   onC
       nSave}mockOonSave={      
    merForm   <Custo
     r(ende> {
      r async () =il format',te emaalidashould v

    it(' });;
   alled()aveBeenCe).not.toHnSavct(mockO  expe   

    });
   ();nTheDocumentBeIuired')).tois reqame tomer nCust('n.getByTexpect(scree     ex {
   =>) aitFor((  await w
    n);
uttosubmitBlick(nt.cEve  fireer');
    eate CustomyText('CrtBreen.gen = scttoBuconst submit    
  
      );
     />  el}
 ={mockOnCanc    onCancel
      ave}e={mockOnS    onSav
      ustomerForm       <Cder(
 {
      ren